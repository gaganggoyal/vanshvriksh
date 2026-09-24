import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "crypto";

/**
 * Passwords are optional here — an emailed code always works — but when a
 * family sets one it is stored as a salted scrypt hash, never readable.
 * Format: scrypt$N$r$p$salt$hash (base64url), so the cost can rise later.
 */

const N = 1 << 15;
const R = 8;
const P = 1;
const KEYLEN = 64;

function scrypt(password: string, salt: Buffer, keylen: number, opts: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) =>
    scryptCb(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

const memFor = (n: number, r: number) => 128 * n * r * 2;

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, KEYLEN, { N, r: R, p: P, maxmem: memFor(N, R) });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [n, r, p] = parts.slice(1, 4).map(Number);
  if (![n, r, p].every((v) => Number.isInteger(v) && v > 0)) return false;
  const salt = Buffer.from(parts[4], "base64url");
  const want = Buffer.from(parts[5], "base64url");
  const got = await scrypt(password.normalize("NFKC"), salt, want.length, { N: n, r, p, maxmem: memFor(n, r) });
  return got.length === want.length && timingSafeEqual(got, want);
}

/** Same work as a real check, so "no such account" and "wrong password" take equally long. */
let dummy: Promise<string> | null = null;
export async function burnPasswordCheck(password: string) {
  dummy ??= hashPassword("not-a-real-password");
  await verifyPassword(password, await dummy);
  return false;
}

const COMMON = new Set([
  "password", "password1", "password123", "12345678", "123456789", "1234567890", "qwertyuiop", "qwerty123",
  "iloveyou", "11111111", "00000000", "abcd1234", "abcdefgh", "letmein1", "welcome1", "admin123", "india123",
  "meravansh", "familytree",
]);

export type PasswordProblem = "short" | "long" | "common" | "email";

/** A light policy: long enough, not a famous password, not the email itself. */
export function passwordProblem(password: string, email = ""): PasswordProblem | null {
  if (password.length < 8) return "short";
  if (password.length > 128) return "long";
  const lower = password.toLowerCase();
  if (COMMON.has(lower) || /^(.)\1+$/.test(password)) return "common";
  const local = email.toLowerCase().split("@")[0];
  if (lower === email.toLowerCase() || (local.length >= 4 && lower === local)) return "email";
  return null;
}

export const PASSWORD_MESSAGES: Record<PasswordProblem, string> = {
  short: "Use at least 8 characters.",
  long: "Use at most 128 characters.",
  common: "That password is too easy to guess. Try a longer phrase.",
  email: "Don't use your email address as your password.",
};
