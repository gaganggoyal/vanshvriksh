import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { clearSessionCookie, requireUser } from "@/lib/auth";

const schema = z.object({ confirm: z.literal(true) });

/**
 * Right to erasure. Removes the user, their tree, every person in it, the
 * relationships and matches that hang off those people (cascade), their
 * sign-in challenges and letterbox copies. Other families' trees are untouched.
 */
export async function DELETE(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (user.tree?.isDemo) return NextResponse.json({ error: "Demo families can't be deleted." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Confirmation required." }, { status: 400 });

  await prisma.$transaction([
    prisma.authChallenge.deleteMany({ where: { email: user.email } }),
    prisma.emailOutbox.deleteMany({ where: { to: user.email } }),
    prisma.person.updateMany({ where: { claimedByUserId: user.id }, data: { claimedByUserId: null } }),
    prisma.user.delete({ where: { id: user.id } }),
  ]);
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
