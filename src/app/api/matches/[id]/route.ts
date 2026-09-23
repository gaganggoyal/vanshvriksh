import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const schema = z.object({
  action: z.enum(["confirm", "dismiss"]),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user?.tree) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid action." }, { status: 400 });

  const match = await prisma.match.findUnique({
    where: { id },
    include: { personA: true, personB: true },
  });
  if (!match) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const mine =
    match.personA.treeId === user.tree.id || match.personB.treeId === user.tree.id;
  if (!mine) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (parsed.data.action === "dismiss") {
    await prisma.match.update({ where: { id }, data: { status: "DISMISSED" } });
    return NextResponse.json({ ok: true, status: "DISMISSED" });
  }

  const confirmedBy = new Set(match.confirmedBy.split(",").filter(Boolean));
  confirmedBy.add(user.id);
  const otherTreeId =
    match.personA.treeId === user.tree.id ? match.personB.treeId : match.personA.treeId;
  const other = await prisma.tree.findUnique({ where: { id: otherTreeId } });
  const both = other ? confirmedBy.has(other.userId) && confirmedBy.has(user.id) : confirmedBy.size >= 1;

  await prisma.match.update({
    where: { id },
    data: {
      confirmedBy: [...confirmedBy].join(","),
      status: both ? "CONFIRMED" : "PENDING",
    },
  });

  return NextResponse.json({
    ok: true,
    status: both ? "CONFIRMED" : "PENDING",
    awaitingOther: !both,
  });
}
