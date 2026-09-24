import { timingSafeEqual } from "crypto";
import { prisma } from "./db";
import { generateOtp, generateToken, hashCode, hashToken } from "./auth";

/**
 * One letter, two ways in: a 6-digit code to type and a link to tap. Both
 * belong to the same challenge row, so using either one spends the letter.
 */

export type Purpose = "signin" | "signup" | "reset" | "invite";

export const MINUTES: Record<Purpose, number> = {
  signin: 15,
  signup: 30,
  reset: 30,
  invite: 7 * 24 * 60,
};

const MAX_ATTEMPTS = 5;

export async function issueChallenge(
  email: string,
  purpose: Purpose,
  opts: { withCode?: boolean; invitePersonId?: string; previewToken?: string } = {},
) {
  const code = opts.withCode === false ? "" : generateOtp();
  const token = generateToken();
  const previewToken = opts.previewToken ?? generateToken();
  const minutes = MINUTES[purpose];
  await prisma.authChallenge.create({
    data: {
      email,
      type: "EMAIL",
      purpose,
      tokenHash: hashToken(token),
      codeHash: code ? hashCode(email, code) : "",
      expiresAt: new Date(Date.now() + minutes * 60 * 1000),
      previewToken,
      invitePersonId: opts.invitePersonId ?? "",
    },
  });
  return { code, token, previewToken, minutes };
}

const sameHex = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export type CodeCheck =
  | { ok: true; challenge: Awaited<ReturnType<typeof prisma.authChallenge.findFirstOrThrow>> }
  | { ok: false; reason: "expired" | "mismatch" | "locked" };

/**
 * People often ask twice and type the code from the first letter, so the
 * three most recent live letters are all accepted.
 */
export async function checkCode(email: string, code: string, purposes: Purpose[]): Promise<CodeCheck> {
  const rows = await prisma.authChallenge.findMany({
    where: {
      email,
      type: "EMAIL",
      purpose: { in: purposes },
      codeHash: { not: "" },
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  const live = rows.filter((r) => r.attempts < MAX_ATTEMPTS);
  if (!rows.length) return { ok: false, reason: "expired" };
  if (!live.length) return { ok: false, reason: "locked" };
  const want = hashCode(email, code);
  const hit = live.find((r) => sameHex(r.codeHash, want));
  if (hit) return { ok: true, challenge: hit };
  await prisma.authChallenge.updateMany({ where: { id: { in: live.map((r) => r.id) } }, data: { attempts: { increment: 1 } } });
  return { ok: false, reason: live.every((r) => r.attempts + 1 >= MAX_ATTEMPTS) ? "locked" : "mismatch" };
}

/** A live challenge behind a link token; older link-only (MAGIC) rows still count. */
export function findByToken(token: string, purposes: Purpose[]) {
  return prisma.authChallenge.findFirst({
    where: {
      tokenHash: hashToken(token),
      type: { in: ["EMAIL", "MAGIC"] },
      purpose: { in: purposes },
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
}

/** Spend a challenge exactly once, even if two tabs race for it. */
export async function consume(id: string) {
  const { count } = await prisma.authChallenge.updateMany({
    where: { id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  return count === 1;
}

/** After a reset, every other reset letter for that address stops working too. */
export function consumeAll(email: string, purpose: Purpose) {
  return prisma.authChallenge.updateMany({
    where: { email, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });
}

export const CODE_ERRORS: Record<"expired" | "mismatch" | "locked", string> = {
  expired: "That code has expired. Request a new one.",
  mismatch: "That code does not match. Check the latest email and try again.",
  locked: "Too many tries. Request a new code.",
};

/** g•••••@gmail.com — enough to recognise, not enough to harvest. */
export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return `${local.slice(0, 1)}${"•".repeat(Math.max(3, Math.min(8, local.length - 1)))}@${domain}`;
}
