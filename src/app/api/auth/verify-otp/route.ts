import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashToken, rateLimit, setSessionCookie } from "@/lib/auth";

const schema = z.object({
  email: z.string().email().transform((e) => e.trim().toLowerCase()),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }
  const { email, code } = parsed.data;
  if (!rateLimit(`otp:${email}`, 8, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many tries. Request a new code." }, { status: 429 });
  }

  const challenge = await prisma.authChallenge.findFirst({
    where: {
      email,
      type: "OTP",
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!challenge) {
    return NextResponse.json({ error: "That code has expired. Request a new one." }, { status: 400 });
  }

  await prisma.authChallenge.update({
    where: { id: challenge.id },
    data: { attempts: { increment: 1 } },
  });

  if (challenge.attempts >= 5) {
    return NextResponse.json({ error: "Too many tries. Request a new code." }, { status: 400 });
  }

  if (challenge.tokenHash !== hashToken(code)) {
    return NextResponse.json({ error: "That code does not match." }, { status: 400 });
  }

  await prisma.authChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: { emailVerified: new Date() },
    create: { email, emailVerified: new Date() },
    include: { tree: true },
  });

  await setSessionCookie({ userId: user.id, email: user.email });
  return NextResponse.json({ ok: true, needsOnboarding: !user.tree });
}
