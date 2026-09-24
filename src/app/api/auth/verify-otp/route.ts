import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimit, startSession } from "@/lib/auth";
import { CODE_ERRORS, checkCode, consume } from "@/lib/challenges";

const schema = z.object({
  email: z.string().email().transform((e) => e.trim().toLowerCase()),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }
  const { email, code } = parsed.data;
  if (!rateLimit(`otp:${email}`, 8, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: CODE_ERRORS.locked }, { status: 429 });
  }

  const check = await checkCode(email, code, ["signin", "signup"]);
  if (!check.ok) return NextResponse.json({ error: CODE_ERRORS[check.reason] }, { status: 400 });
  if (!(await consume(check.challenge.id))) return NextResponse.json({ error: CODE_ERRORS.expired }, { status: 400 });

  const user = await prisma.user.upsert({
    where: { email },
    update: { emailVerified: new Date() },
    create: { email, emailVerified: new Date() },
    include: { tree: true },
  });
  await startSession(user);
  return NextResponse.json({
    ok: true,
    needsOnboarding: !user.tree,
    // A brand-new account is offered a password next; a returning one is not nagged.
    needsPassword: check.challenge.purpose === "signup" && !user.passwordHash,
  });
}
