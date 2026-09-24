import { createHmac, timingSafeEqual } from "crypto";

/** A signed, permanent token for one-click "stop these emails" links — no sign-in needed. */

const sign = (userId: string) =>
  createHmac("sha256", process.env.AUTH_SECRET || "dev-secret").update(`unsubscribe:${userId}`).digest("base64url").slice(0, 32);

export function unsubscribeToken(userId: string) {
  return `${Buffer.from(userId).toString("base64url")}.${sign(userId)}`;
}

export function readUnsubscribeToken(token: string): string | null {
  const [id64, sig] = token.split(".");
  if (!id64 || !sig) return null;
  const userId = Buffer.from(id64, "base64url").toString();
  const want = sign(userId);
  return sig.length === want.length && timingSafeEqual(Buffer.from(sig), Buffer.from(want)) ? userId : null;
}
