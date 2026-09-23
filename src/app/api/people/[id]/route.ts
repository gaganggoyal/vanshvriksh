import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { updatePerson } from "@/lib/people";
import { ownerPerson } from "@/lib/privacy";

const schema = z.object({
  givenName: z.string().min(1).optional(),
  familyName: z.string().optional(),
  nativeName: z.string().optional(),
  alsoKnownAs: z.string().optional(),
  gender: z.enum(["FEMALE", "MALE", "OTHER", "UNKNOWN"]).optional(),
  birthDate: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(""), z.null()]).optional(),
  birthPlace: z.string().optional(),
  deathDate: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(""), z.null()]).optional(),
  isLiving: z.boolean().optional(),
  gotra: z.string().optional(),
  village: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user?.tree) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await ctx.params;
  const person = await prisma.person.findUnique({ where: { id } });
  if (!person || person.treeId !== user.tree.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid details." }, { status: 400 });
  const data = {
    ...parsed.data,
    birthDate: parsed.data.birthDate === "" ? null : parsed.data.birthDate,
    deathDate: parsed.data.deathDate === "" ? null : parsed.data.deathDate,
  };
  const updated = await updatePerson(id, data);
  return NextResponse.json({ person: updated ? ownerPerson(updated) : null });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user?.tree) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await ctx.params;
  const person = await prisma.person.findUnique({ where: { id } });
  if (!person || person.treeId !== user.tree.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (person.isRoot) {
    return NextResponse.json({ error: "You cannot remove yourself from your own tree." }, { status: 400 });
  }
  await prisma.person.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
