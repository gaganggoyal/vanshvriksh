import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const schema = z.object({
  locale: z.enum(["en", "hi"]).optional(),
  discoverable: z.boolean().optional(),
});

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json({ locale: user.locale, email: user.email, discoverable: user.tree?.discoverable ?? true });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid." }, { status: 400 });
  const { locale, discoverable } = parsed.data;
  const updated = locale ? await prisma.user.update({ where: { id: user.id }, data: { locale } }) : user;
  if (discoverable !== undefined && user.tree) {
    await prisma.tree.update({ where: { id: user.tree.id }, data: { discoverable } });
  }
  return NextResponse.json({
    ok: true,
    locale: updated.locale,
    discoverable: discoverable ?? user.tree?.discoverable ?? true,
  });
}
