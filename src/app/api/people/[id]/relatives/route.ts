import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { addRelative } from "@/lib/people";
import { ownerPerson } from "@/lib/privacy";

const schema = z.object({
  relation: z.enum(["father", "mother", "spouse", "child", "sibling"]),
  givenName: z.string().min(1),
  familyName: z.string().optional().default(""),
  nativeName: z.string().optional().default(""),
  alsoKnownAs: z.string().optional().default(""),
  gender: z.enum(["FEMALE", "MALE", "OTHER", "UNKNOWN"]).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  village: z.string().optional().default(""),
  gotra: z.string().optional().default(""),
  isLiving: z.boolean().optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user?.tree) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await ctx.params;
  const focus = await prisma.person.findUnique({ where: { id } });
  if (!focus || focus.treeId !== user.tree.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A given name is required." }, { status: 400 });
  }
  const created = await addRelative(user.tree.id, id, parsed.data.relation, parsed.data);
  return NextResponse.json({ person: ownerPerson(created) });
}
