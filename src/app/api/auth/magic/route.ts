import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken, setSessionCookie, appUrlFromRequest } from "@/lib/auth";
import { linkPersons } from "@/lib/matching";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const origin = appUrlFromRequest(req);
  if (!token) {
    return NextResponse.redirect(`${origin}/login?error=invalid`);
  }

  const challenge = await prisma.authChallenge.findFirst({
    where: {
      type: "MAGIC",
      tokenHash: hashToken(token),
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!challenge) {
    return NextResponse.redirect(`${origin}/login?error=invalid`);
  }

  await prisma.authChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  });

  const user = await prisma.user.upsert({
    where: { email: challenge.email },
    update: { emailVerified: new Date() },
    create: { email: challenge.email, emailVerified: new Date() },
    include: { tree: true },
  });
  await setSessionCookie({ userId: user.id, email: user.email });

  // An invitation that names a person: link on arrival (or on onboarding for a new family).
  if (challenge.invitePersonId) {
    const invited = await prisma.person.findUnique({
      where: { id: challenge.invitePersonId },
      include: { tree: true },
    });
    if (invited && invited.tree.userId !== user.id) {
      if (!user.tree) {
        await prisma.user.update({ where: { id: user.id }, data: { invitePersonId: invited.id } });
        return NextResponse.redirect(`${origin}/onboarding`);
      }
      const root = await prisma.person.findFirst({ where: { treeId: user.tree.id, isRoot: true } });
      if (root) {
        await linkPersons(root.id, invited.id, {
          by: [invited.tree.userId],
          source: "invite",
          reason: "Invited as this person",
        });
        return NextResponse.redirect(`${origin}/matches`);
      }
    }
  }

  return NextResponse.redirect(`${origin}${user.tree ? "/tree" : "/onboarding"}`);
}
