import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { appUrlFromRequest, generateOtp, generateToken, hashToken, rateLimit } from "@/lib/auth";
import { deliverMail, deliveryMode, magicMail, otpMail, withOrigin } from "@/lib/email";

const schema = z.object({
  email: z.string().email().transform((e) => e.trim().toLowerCase()),
  method: z.enum(["otp", "link", "both"]).default("otp"),
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  const { email, method } = parsed.data;

  if (!rateLimit(`auth-ip:${ip}`, 30, 10 * 60 * 1000).ok || !rateLimit(`auth:${ip}:${email}`, 6, 10 * 60 * 1000).ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes." },
      { status: 429 },
    );
  }

  const previewToken = generateToken();
  const now = Date.now();
  let sent: "otp" | "link" | "both" = method;

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
    await withOrigin(appUrlFromRequest(req), () => deliverMail(otpMail(email, otp, previewToken)));
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

  return NextResponse.json({
    ok: true,
    sent,
    delivery: deliveryMode() === "resend" ? "email" : "letterbox",
    previewToken: deliveryMode() === "resend" ? undefined : previewToken,
  });
}
