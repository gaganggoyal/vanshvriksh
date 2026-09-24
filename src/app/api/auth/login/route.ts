import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit, startSession } from "@/lib/auth";
import { burnPasswordCheck, verifyPassword } from "@/lib/password";

const schema = z.object({
  email: z.string().email().transform((e) => e.trim().toLowerCase()),
  password: z.string().min(1).max(200),
});

const WRONG = "Email or password is incorrect.";

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: WRONG }, { status: 400 });
  const { email, password } = parsed.data;

  const ip = clientIp(req);
  if (!rateLimit(`login-ip:${ip}`, 30, 10 * 60 * 1000).ok || !rateLimit(`login:${email}`, 10, 10 * 60 * 1000).ok) {
    return NextResponse.json(
      { error: "Too many attempts. Wait a few minutes, or sign in with an email code." },
      { status: 429 },
    );
  }

  const user = await prisma.user.findUnique({ where: { email }, include: { tree: true } });
  // No account, or an account that only ever used email codes: same answer, same time taken.
  const ok = user?.passwordHash ? await verifyPassword(password, user.passwordHash) : await burnPasswordCheck(password);
  if (!user || !ok) return NextResponse.json({ error: WRONG }, { status: 401 });

  await startSession(user);
  return NextResponse.json({ ok: true, needsOnboarding: !user.tree });
}
