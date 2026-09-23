import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ user: null });
  const pending = user.tree
    ? await prisma.match.count({
        where: {
          status: "PENDING",
          OR: [
            { personA: { treeId: user.tree.id } },
            { personB: { treeId: user.tree.id } },
          ],
        },
      })
    : 0;
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      locale: user.locale,
      hasTree: Boolean(user.tree),
      pendingMatches: pending,
    },
  });
}
