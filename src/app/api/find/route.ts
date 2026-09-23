import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { rateLimit, requireUser } from "@/lib/auth";
import { commonPlaces, searchRelatives } from "@/lib/discover";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user?.tree) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 120);
  const yearRaw = Number(url.searchParams.get("year"));
  const year = Number.isInteger(yearRaw) && yearRaw > 1800 && yearRaw < 2100 ? yearRaw : null;

  if (!q) return NextResponse.json({ results: [], places: await commonPlaces(12, user.tree.isDemo) });

  // Living people are gated on knowing a birth year; don't let anyone sweep the years.
  if (!rateLimit(`find:${user.id}`, 60, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many searches. Please wait a few minutes." }, { status: 429 });
  }
  const results = await searchRelatives({ query: q, birthYear: year, viewerTreeId: user.tree.id, viewerIsDemo: user.tree.isDemo });
  return NextResponse.json({ results });
}
