import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { appUrlFromRequest, rateLimit, requireUser, startSession } from "@/lib/auth";
import { deliverMail } from "@/lib/email";
import { passwordChangedMail } from "@/lib/mail-templates";
import { PASSWORD_MESSAGES, hashPassword, passwordProblem, verifyPassword } from "@/lib/password";

const schema = z.object({
  password: z.string().max(200),
  currentPassword: z.string().max(200).optional(),
});

/** Set a first password (after sign-up) or change the one you have. */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (user.tree?.isDemo) {
    return NextResponse.json({ error: "Demo families are shared, so they can't have a password." }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a password." }, { status: 400 });
  if (!rateLimit(`password:${user.id}`, 10, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many attempts. Please wait a few minutes." }, { status: 429 });
  }

  const { password, currentPassword } = parsed.data;
  const changing = Boolean(user.passwordHash);
  if (changing && !(currentPassword && (await verifyPassword(currentPassword, user.passwordHash)))) {
    return NextResponse.json({ error: "Your current password is incorrect." }, { status: 400 });
  }
  const problem = passwordProblem(password, user.email);
  if (problem) return NextResponse.json({ error: PASSWORD_MESSAGES[problem] }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password), passwordSetAt: new Date(), sessionVersion: { increment: 1 } },
  });
  // This device stays signed in; every other one has to sign in again.
  await startSession(updated);

  if (changing) {
    try {
      await deliverMail(
        passwordChangedMail({ to: user.email, when: new Date(), origin: appUrlFromRequest(req), locale: user.locale === "hi" ? "hi" : "en" }),
      );
    } catch (err) {
      console.error("[auth] password-changed notice failed:", err instanceof Error ? err.message : err);
    }
  }
  return NextResponse.json({ ok: true });
}
