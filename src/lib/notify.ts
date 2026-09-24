import { prisma } from "./db";
import { appUrl } from "./auth";
import { BRAND } from "./brand";
import { canSendSignIn, deliverMail } from "./email";
import { bridgeBetween } from "./family";
import { matchMail } from "./mail-templates";
import { sharedNames, type MatchReason, type NewMatch } from "./matching";
import { displayName } from "./names";
import { neighbours } from "./neighbours";
import { unsubscribeToken } from "./unsubscribe";

const QUIET_HOURS = 24;

/**
 * Tell the other family a possible relative has appeared — at most once a day
 * per family, only if they want these alerts, and never with a date in it.
 * Failures are logged, not thrown: a lost letter must not block the person
 * being saved.
 */
export async function notifyKinFound(found: NewMatch[]) {
  if (process.env.VV_NO_NOTIFY === "1" || !canSendSignIn()) return;
  const byTree = new Map<string, NewMatch[]>();
  for (const m of found) byTree.set(m.otherTreeId, [...(byTree.get(m.otherTreeId) ?? []), m]);
  if (!byTree.size) return;

  const since = new Date(Date.now() - QUIET_HOURS * 60 * 60 * 1000);
  const origin = appUrl();
  for (const [treeId, list] of byTree) {
    try {
      const tree = await prisma.tree.findUnique({ where: { id: treeId }, include: { user: true } });
      if (!tree || tree.isDemo || !tree.user.notifyMatches) continue;
      if (tree.user.kinNotifiedAt && tree.user.kinNotifiedAt > since) continue;

      const first = list[0];
      const [row, mine, theirs] = await Promise.all([
        prisma.match.findUnique({ where: { id: first.matchId } }),
        prisma.person.findUnique({ where: { id: first.otherPersonId } }),
        prisma.person.findUnique({ where: { id: first.personId } }),
      ]);
      if (!row || !mine || !theirs) continue;

      const [myKin, theirKin] = await Promise.all([neighbours(mine.id), neighbours(theirs.id)]);
      let term: { hi: string; en: string | null; female: boolean } | null = null;
      try {
        const bridge = await bridgeBetween(tree.id, theirs.treeId, [mine.id, theirs.id], false);
        if (bridge.term?.hi) term = { hi: bridge.term.hi, en: bridge.term.en ?? null, female: bridge.female };
      } catch {
        // The relation line is a nicety; the letter goes without it.
      }
      const more = await prisma.match.count({
        where: { status: "PENDING", id: { not: row.id }, OR: [{ personA: { treeId } }, { personB: { treeId } }] },
      });

      await prisma.user.update({ where: { id: tree.userId }, data: { kinNotifiedAt: new Date() } });
      const token = unsubscribeToken(tree.userId);
      const mail = matchMail({
        to: tree.user.email,
        origin,
        locale: tree.user.locale === "hi" ? "hi" : "en",
        matchId: row.id,
        mine: displayName(mine),
        theirs: displayName(theirs),
        isYou: mine.isRoot || mine.claimedByUserId === tree.userId,
        reasons: (JSON.parse(row.reasons) as MatchReason[]).map((r) => r.code),
        shared: sharedNames(myKin.all, theirKin.all),
        term,
        score: row.score,
        more,
        unsubscribeUrl: `${origin}/unsubscribe?token=${token}`,
      });
      await deliverMail({
        ...mail,
        headers: {
          "List-Unsubscribe": `<${origin}/api/unsubscribe?token=${token}>, <mailto:${BRAND.contact}?subject=unsubscribe>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
    } catch (err) {
      console.error("kin notification failed", err);
    }
  }
}
