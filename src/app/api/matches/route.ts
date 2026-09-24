import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publicPerson } from "@/lib/privacy";
import { publicReasons, sharedNames, type MatchReason } from "@/lib/matching";
import { bridgeBetween } from "@/lib/family";
import { neighbours } from "@/lib/neighbours";

export async function GET() {
  const user = await requireUser();
  if (!user?.tree) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const treeId = user.tree.id;

  const rows = await prisma.match.findMany({
    where: {
      OR: [{ personA: { treeId } }, { personB: { treeId } }],
    },
    include: {
      personA: true,
      personB: true,
    },
    orderBy: [{ status: "asc" }, { score: "desc" }],
  });

  const cache = new Map();
  const payload = [];
  for (const row of rows) {
    const mine = row.personA.treeId === treeId ? row.personA : row.personB;
    const theirs = mine.id === row.personA.id ? row.personB : row.personA;
    const rawReasons = JSON.parse(row.reasons) as MatchReason[];
    const reasons = publicReasons(rawReasons);
    if (rawReasons.some((r) => r.code.startsWith("dob") || r.code.startsWith("year"))) {
      reasons.unshift({
        code: "private_records",
        label: "Private records agree",
        weight: 0,
      });
    }
    const [mineRels, theirRels] = await Promise.all([neighbours(mine.id), neighbours(theirs.id)]);
    const shared = sharedNames(mineRels.all, theirRels.all);
    const confirmedBy = new Set(row.confirmedBy.split(",").filter(Boolean));
    const confirmedByMe = confirmedBy.has(user.id);
    // How the other tree's writer is related to you across this link. The name
    // is revealed only once both families have agreed.
    const bridge =
      row.status === "DISMISSED"
        ? null
        : await bridgeBetween(
            treeId,
            theirs.treeId,
            row.status === "PENDING" ? [mine.id, theirs.id] : null,
            row.status === "CONFIRMED",
            cache,
          );
    payload.push({
      id: row.id,
      status: row.status,
      score: row.score,
      source: row.source,
      reasons: reasons.map((r) => r.label),
      reasonCodes: reasons.map((r) => ({ code: r.code, label: r.label })),
      bridge: bridge && {
        hi: bridge.term?.hi ?? null,
        en: bridge.term?.en ?? null,
        name: bridge.name,
        adds: bridge.adds,
        female: bridge.female,
      },
      mine: publicPerson(mine),
      theirs: publicPerson(theirs),
      sharedRelatives: shared,
      confirmedByMe,
      confirmedByThem: confirmedBy.size > (confirmedByMe ? 1 : 0),
      // Once both families agree, the names written around that person open up — names only.
      linked: row.status === "CONFIRMED" ? theirRels.groups : null,
    });
  }

  const order: Record<string, number> = { PENDING: 0, CONFIRMED: 1, DISMISSED: 2 };
  payload.sort((a, b) => order[a.status] - order[b.status] || b.score - a.score);
  return NextResponse.json({ matches: payload });
}
