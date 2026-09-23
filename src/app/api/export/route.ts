import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toGedcom } from "@/lib/gedcom";
import { ownerPerson } from "@/lib/privacy";

/**
 * The owner's own copy of their tree, private dates included. GEDCOM for
 * other genealogy programs, JSON for everything as stored.
 */
export async function GET(req: Request) {
  const user = await requireUser();
  if (!user?.tree) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const format = new URL(req.url).searchParams.get("format") === "json" ? "json" : "gedcom";

  const people = await prisma.person.findMany({ where: { treeId: user.tree.id }, orderBy: { createdAt: "asc" } });
  const rels = await prisma.relationship.findMany({ where: { treeId: user.tree.id } });
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    const body = {
      exportedAt: new Date().toISOString(),
      app: "Mera Vansh",
      tree: { id: user.tree.id, title: user.tree.title },
      people: people.map(ownerPerson),
      relationships: rels.map((r) => ({ type: r.type, fromId: r.fromId, toId: r.toId })),
    };
    return new NextResponse(JSON.stringify(body, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="mera-vansh-${stamp}.json"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const ged = toGedcom(people, rels, { title: user.tree.title });
  return new NextResponse(ged, {
    headers: {
      "Content-Type": "text/x-gedcom; charset=utf-8",
      "Content-Disposition": `attachment; filename="mera-vansh-${stamp}.ged"`,
      "Cache-Control": "no-store",
    },
  });
}
