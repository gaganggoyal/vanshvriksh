import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { appUrlFromRequest, clientIp, generateToken, rateLimit } from "@/lib/auth";
import { issueChallenge } from "@/lib/challenges";
import { canSendSignIn, deliverMail, emailReady, letterboxAllowed } from "@/lib/email";
import { resetMail, signinMail, signupMail } from "@/lib/mail-templates";

const schema = z.object({
  email: z.string().email().transform((e) => e.trim().toLowerCase()),
  /** signup → "Confirm your email"; signin → sign-in code; reset → password reset. */
  intent: z.enum(["signin", "signup", "register", "reset"]).default("signin"),
  locale: z.enum(["en", "hi"]).optional(),
});

/**
 * Every answer looks the same whether or not the address has an account, so
 * this endpoint can't be used to find out who is on Mera Vansh.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  const { email } = parsed.data;
  const intent = parsed.data.intent === "register" ? "signup" : parsed.data.intent;

  if (!canSendSignIn()) {
    return NextResponse.json(
      { error: "Email sign-in is being set up. Please try again soon — or walk a demo family meanwhile." },
      { status: 503 },
    );
  }

  if (!rateLimit(`auth-ip:${ip}`, 30, 10 * 60 * 1000).ok || !rateLimit(`auth:${ip}:${email}`, 6, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many attempts. Please wait a few minutes." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email }, include: { tree: { select: { isDemo: true } } } });
  // Demo addresses have no inbox; a letter there would only bounce.
  if (user?.tree?.isDemo) {
    return NextResponse.json({ error: "This is a demo family — use the demo buttons to look around." }, { status: 403 });
  }

  const origin = appUrlFromRequest(req);
  const locale = parsed.data.locale ?? (user?.locale === "hi" ? "hi" : "en");
  let previewToken = "";

  try {
    if (intent === "reset") {
      // Only real accounts get a reset letter; the reply is the same either way.
      if (user) {
        const ch = await issueChallenge(email, "reset");
        previewToken = ch.previewToken;
        const link = `${origin}/reset?token=${ch.token}`;
        await deliverMail(resetMail({ to: email, code: ch.code, link, minutes: ch.minutes, origin, locale, previewToken }));
      } else {
        previewToken = generateToken();
      }
    } else if (user) {
      const ch = await issueChallenge(email, "signin");
      previewToken = ch.previewToken;
      const link = `${origin}/auth/magic?token=${ch.token}`;
      await deliverMail(
        signinMail({ to: email, code: ch.code, link, minutes: ch.minutes, origin, locale, previewToken, existing: intent === "signup" }),
      );
    } else {
      const ch = await issueChallenge(email, "signup");
      previewToken = ch.previewToken;
      const link = `${origin}/auth/magic?token=${ch.token}`;
      await deliverMail(signupMail({ to: email, code: ch.code, link, minutes: ch.minutes, origin, locale, previewToken }));
    }
  } catch (err) {
    // A wrong key or an unverified domain lands here; say so plainly instead of a bare 500.
    console.error("[auth] sign-in email failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "We couldn't send the email just now. Please try again in a minute." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    sent: intent,
    delivery: emailReady() ? "email" : "letterbox",
    previewToken: letterboxAllowed() ? previewToken || undefined : undefined,
  });
}
