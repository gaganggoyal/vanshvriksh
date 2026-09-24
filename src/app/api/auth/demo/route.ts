import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { demoEnabled, startSession } from "@/lib/auth";

export async function POST(req: Request) {
  if (!demoEnabled()) {
    return NextResponse.json({ error: "Demo logins are disabled." }, { status: 403 });
  }
  const { who } = (await req.json().catch(() => ({}))) as { who?: string };
  const email =
    who === "arjun" ? "arjun@demo.meravansh.lol" : who === "mahesh" ? "mahesh@demo.meravansh.lol" : "priya@demo.meravansh.lol";
  const user = await prisma.user.findUnique({ where: { email }, include: { tree: true } });
  if (!user) {
    return NextResponse.json(
      { error: "Demo families are not seeded. Run npm run db:seed." },
      { status: 400 },
    );
  }
  await startSession(user);
  return NextResponse.json({ ok: true, needsOnboarding: !user.tree });
}
