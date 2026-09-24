import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { appUrlFromRequest, clientIp, rateLimit, startSession } from "@/lib/auth";
import { CODE_ERRORS, checkCode, consume, consumeAll, findByToken } from "@/lib/challenges";
import { deliverMail } from "@/lib/email";
import { passwordChangedMail } from "@/lib/mail-templates";
import { PASSWORD_MESSAGES, hashPassword, passwordProblem } from "@/lib/password";

const schema = z
  .object({
    password: z.string().max(200),
    token: z.string().regex(/^[a-f0-9]{64}$/).optional(),
    email: z.string().email().transform((e) => e.trim().toLowerCase()).optional(),
    code: z.string().regex(/^\d{6}$/).optional(),
  })
  .refine((v) => v.token || (v.email && v.code), { message: "Enter the code from the email." });

const EXPIRED = "This reset link has expired or was already used. Request a new one.";

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter the 6-digit code and a new password." }, { status: 400 });
  const { password, token, code } = parsed.data;

  if (!rateLimit(`reset:${clientIp(req)}`, 20, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many attempts. Please wait a few minutes." }, { status: 429 });
  }

  // Check the password first, so a weak one doesn't spend the letter.
  const email = parsed.data.email ?? (token ? (await findByToken(token, ["reset"]))?.email : undefined);
  if (!email) return NextResponse.json({ error: EXPIRED }, { status: 400 });
  const problem = passwordProblem(password, email);
  if (problem) return NextResponse.json({ error: PASSWORD_MESSAGES[problem] }, { status: 400 });

  let challengeId: string;
  if (token) {
    const challenge = await findByToken(token, ["reset"]);
    if (!challenge) return NextResponse.json({ error: EXPIRED }, { status: 400 });
    challengeId = challenge.id;
  } else {
    const check = await checkCode(email, code!, ["reset"]);
    if (!check.ok) return NextResponse.json({ error: CODE_ERRORS[check.reason] }, { status: 400 });
    challengeId = check.challenge.id;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing || !(await consume(challengeId))) return NextResponse.json({ error: EXPIRED }, { status: 400 });
  await consumeAll(email, "reset");

  const user = await prisma.user.update({
    where: { id: existing.id },
    data: {
      passwordHash: await hashPassword(password),
      passwordSetAt: new Date(),
      emailVerified: new Date(),
      // Every other signed-in device has to sign in again with the new password.
      sessionVersion: { increment: 1 },
    },
    include: { tree: true },
  });
  await startSession(user);

  try {
    const origin = appUrlFromRequest(req);
    await deliverMail(passwordChangedMail({ to: email, when: new Date(), origin, locale: user.locale === "hi" ? "hi" : "en" }));
  } catch (err) {
    console.error("[auth] password-changed notice failed:", err instanceof Error ? err.message : err);
  }
  return NextResponse.json({ ok: true, needsOnboarding: !user.tree });
}
