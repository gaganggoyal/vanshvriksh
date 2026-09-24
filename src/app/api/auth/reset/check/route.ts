import { NextResponse } from "next/server";
import { z } from "zod";
import { findByToken, maskEmail } from "@/lib/challenges";

const schema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) });

/** Is this reset link still good? Looks only — the letter is spent when the new password is saved. */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const challenge = await findByToken(parsed.data.token, ["reset"]);
  if (!challenge) return NextResponse.json({ error: "invalid" }, { status: 400 });
  return NextResponse.json({ ok: true, email: maskEmail(challenge.email) });
}
