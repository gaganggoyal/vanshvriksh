import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readUnsubscribeToken } from "@/lib/unsubscribe";

/**
 * Turn relative alerts off (or back on). Mail apps call this directly for
 * their one-click "Unsubscribe" button (RFC 8058); the /unsubscribe page
 * calls it when a person presses the button there.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const userId = readUnsubscribeToken(url.searchParams.get("token") || "");
  if (!userId) return NextResponse.json({ error: "This link is not valid." }, { status: 400 });
  const body = req.headers.get("content-type")?.includes("application/json")
    ? ((await req.json().catch(() => ({}))) as { on?: boolean })
    : {};
  const on = body.on === true;
  const { count } = await prisma.user.updateMany({ where: { id: userId }, data: { notifyMatches: on } });
  if (!count) return NextResponse.json({ error: "This account no longer exists." }, { status: 404 });
  return NextResponse.json({ ok: true, notifyMatches: on });
}
