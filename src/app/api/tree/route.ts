import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadExtendedFamily, linkedTreeIds } from "@/lib/family";
import { ownerPerson } from "@/lib/privacy";
import { displayName, initials } from "@/lib/names";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!user.tree) return NextResponse.json({ error: "Onboarding required." }, { status: 409 });
  const withLinked = new URL(req.url).searchParams.get("linked") === "1";

  const root = await prisma.person.findFirst({ where: { treeId: user.tree.id, isRoot: true } });
  const base = { treeId: user.tree.id, title: user.tree.title, focusId: root?.id ?? null };

  if (withLinked) {
    const ext = await loadExtendedFamily(user.tree.id);
    return NextResponse.json({ ...base, ...ext });
  }

  const [people, rels, linked] = await Promise.all([
    prisma.person.findMany({ where: { treeId: user.tree.id }, orderBy: { createdAt: "asc" } }),
    prisma.relationship.findMany({ where: { treeId: user.tree.id } }),
    linkedTreeIds(user.tree.id),
  ]);
  return NextResponse.json({
    ...base,
    focusId: base.focusId ?? people[0]?.id ?? null,
    people: people.map((p) => ({
      ...ownerPerson(p),
      displayName: displayName(p),
      initials: initials(p),
      external: false,
      family: null,
    })),
    relationships: rels.map((r) => ({ id: r.id, type: r.type, fromId: r.fromId, toId: r.toId })),
    linkedFamilies: linked.map((treeId) => ({ treeId })),
  });
}
