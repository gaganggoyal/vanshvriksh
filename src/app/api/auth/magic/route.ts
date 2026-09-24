import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { startSession } from "@/lib/auth";
import { consume, findByToken } from "@/lib/challenges";
import { linkPersons } from "@/lib/matching";

const schema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) });

/**
 * The emailed button opens /auth/magic, which posts the token here. A POST —
 * not a GET — so mail scanners that pre-open links don't spend the letter.
 */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const challenge = await findByToken(parsed.data.token, ["signin", "signup", "invite"]);
  if (!challenge || !(await consume(challenge.id))) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const user = await prisma.user.upsert({
    where: { email: challenge.email },
    update: { emailVerified: new Date() },
    create: { email: challenge.email, emailVerified: new Date() },
    include: { tree: true },
  });
  await startSession(user);

  const firstVisit = !user.passwordHash && !user.tree;
  const go = (path: string) =>
    NextResponse.json({ ok: true, redirect: firstVisit ? `/welcome?next=${encodeURIComponent(path)}` : path });

  // An invitation that names a person: link on arrival (or on onboarding for a new family).
  if (challenge.invitePersonId) {
    const invited = await prisma.person.findUnique({
      where: { id: challenge.invitePersonId },
      include: { tree: true },
    });
    if (invited && invited.tree.userId !== user.id) {
      if (!user.tree) {
        await prisma.user.update({ where: { id: user.id }, data: { invitePersonId: invited.id } });
        return go("/onboarding");
      }
      const root = await prisma.person.findFirst({ where: { treeId: user.tree.id, isRoot: true } });
      if (root) {
        await linkPersons(root.id, invited.id, {
          by: [invited.tree.userId],
          source: "invite",
          reason: "Invited as this person",
        });
        return go("/matches");
      }
    }
  }

  return go(user.tree ? "/tree" : "/onboarding");
}
