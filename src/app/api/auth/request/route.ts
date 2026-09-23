import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { appUrlFromRequest, generateOtp, generateToken, hashToken, rateLimit } from "@/lib/auth";
import { canSendSignIn, deliverMail, emailReady, letterboxAllowed, magicMail, otpMail, withOrigin } from "@/lib/email";

const schema = z.object({
  email: z.string().email().transform((e) => e.trim().toLowerCase()),
  method: z.enum(["otp", "link", "both"]).default("otp"),
  /** "register" only changes the greeting; sign-up and sign-in are the same passwordless step. */
  intent: z.enum(["signin", "register"]).optional(),
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  const { email, method, intent } = parsed.data;

  if (!canSendSignIn()) {
    return NextResponse.json(
      { error: "Email sign-in is being set up. Please try again soon — or walk a demo family meanwhile." },
      { status: 503 },
    );
  }

  if (!rateLimit(`auth-ip:${ip}`, 30, 10 * 60 * 1000).ok || !rateLimit(`auth:${ip}:${email}`, 6, 10 * 60 * 1000).ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes." },
      { status: 429 },
    );
  }

  const previewToken = generateToken();
  const now = Date.now();
  let sent: "otp" | "link" | "both" = method;

  try {
    if (method === "otp" || method === "both") {
      const otp = generateOtp();
      await prisma.authChallenge.create({
        data: {
          email,
          type: "OTP",
          tokenHash: hashToken(otp),
          expiresAt: new Date(now + 10 * 60 * 1000),
          previewToken,
        },
      });
      await withOrigin(appUrlFromRequest(req), () => deliverMail(otpMail(email, otp, previewToken, intent === "register")));
    }

    if (method === "link" || method === "both") {
      const token = generateToken();
      await prisma.authChallenge.create({
        data: {
          email,
          type: "MAGIC",
          tokenHash: hashToken(token),
          expiresAt: new Date(now + 20 * 60 * 1000),
          previewToken,
        },
      });
      await withOrigin(appUrlFromRequest(req), () => deliverMail(magicMail(email, token, previewToken)));
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
    sent,
    delivery: emailReady() ? "email" : "letterbox",
    previewToken: letterboxAllowed() ? previewToken : undefined,
  });
}
