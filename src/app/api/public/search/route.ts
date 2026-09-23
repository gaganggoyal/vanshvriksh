import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { rateLimit } from "@/lib/auth";
import { publicTeaser } from "@/lib/discover";

/** Signed-out teaser: counts of remembered people answering to a name. Nothing identifying. */
export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`teaser:${ip}`, 40, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many searches." }, { status: 429 });
  }
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  return NextResponse.json(await publicTeaser(q));
}
