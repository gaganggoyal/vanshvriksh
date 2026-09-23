import { prisma } from "./db";
import { canSendSignIn, deliverMail, kinFoundMail } from "./email";
import { displayName } from "./names";
import type { NewMatch } from "./matching";

const QUIET_HOURS = 24;

/**
 * Tell the other family a possible relative has appeared — at most once a day
 * per family, and never with a date in it. Failures are logged, not thrown:
 * a lost letter must not block the person being saved.
 */
export async function notifyKinFound(found: NewMatch[]) {
  if (process.env.VV_NO_NOTIFY === "1" || !canSendSignIn()) return;
  const byTree = new Map<string, NewMatch>();
  for (const m of found) if (!byTree.has(m.otherTreeId)) byTree.set(m.otherTreeId, m);
  if (!byTree.size) return;

  const since = new Date(Date.now() - QUIET_HOURS * 60 * 60 * 1000);
  for (const [treeId, m] of byTree) {
    try {
      const tree = await prisma.tree.findUnique({ where: { id: treeId }, include: { user: true } });
      if (!tree || tree.isDemo || (tree.user.kinNotifiedAt && tree.user.kinNotifiedAt > since)) continue;
      const theirPerson = await prisma.person.findUnique({ where: { id: m.otherPersonId } });
      if (!theirPerson) continue;
      await prisma.user.update({ where: { id: tree.userId }, data: { kinNotifiedAt: new Date() } });
      await deliverMail(kinFoundMail(tree.user.email, displayName(theirPerson), tree.user.locale === "hi" ? "hi" : "en"));
    } catch (err) {
      console.error("kin notification failed", err);
    }
  }
}
