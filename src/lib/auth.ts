import { createHash, createHmac, randomBytes, randomInt } from "crypto";
import { prisma } from "./db";
import { getSession, setSessionCookie, clearSessionCookie, type Session } from "./session";

export { getSession, setSessionCookie, clearSessionCookie };
export type { Session };

export function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

/** Codes are only a million strong, so they are keyed with the server secret rather than plainly hashed. */
export function hashCode(email: string, code: string) {
  return createHmac("sha256", process.env.AUTH_SECRET || "dev-secret").update(`${email}:${code}`).digest("hex");
}

export function generateOtp() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function generateToken() {
  return randomBytes(32).toString("hex");
}

export async function requireUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { tree: true },
  });
  // Signed before the password last changed: that device has to sign in again.
  if (!user || user.sessionVersion !== session.v) return null;
  return user;
}

export async function startSession(user: { id: string; email: string; sessionVersion: number }) {
  await setSessionCookie({ userId: user.id, email: user.email, v: user.sessionVersion });
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const row = buckets.get(key);
  if (!row || row.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (row.count >= limit) return { ok: false, remaining: 0 };
  row.count += 1;
  return { ok: true, remaining: limit - row.count };
}

export function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function appUrlFromRequest(req: Request) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!host) return appUrl();
  const forwarded = req.headers.get("x-forwarded-proto");
  const proto = forwarded || (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`.replace(/\/$/, "");
}

export function demoEnabled() {
  return process.env.ALLOW_DEMO === "true";
}
