import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { letterboxAllowed } from "@/lib/email";

export async function GET(req: Request) {
  if (!letterboxAllowed()) {
    return NextResponse.json({ error: "Letterbox is only for local delivery." }, { status: 404 });
  }
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  if (!token) return NextResponse.json({ error: "Missing token." }, { status: 400 });

  const rows = await prisma.emailOutbox.findMany({
    where: { previewToken: token },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  return NextResponse.json({
    emails: rows.map((r) => ({
      id: r.id,
      to: r.to,
      subject: r.subject,
      html: r.html,
      text: r.text,
      purpose: r.purpose,
      createdAt: r.createdAt,
    })),
  });
}
