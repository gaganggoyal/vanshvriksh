import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { appUrlFromRequest, generateToken, hashToken, rateLimit, requireUser } from "@/lib/auth";
import { canSendSignIn, deliverMail, emailReady, inviteMail, letterboxAllowed, withOrigin } from "@/lib/email";
import { kinship } from "@/lib/kinship";
import { displayName } from "@/lib/names";

const schema = z.object({
  email: z.string().email().transform((e) => e.trim().toLowerCase()),
  /** The person in your tree this invitation is for; their tree links to yours when they join. */
  personId: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user?.tree) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  // Demo families are shared by every visitor; they must not become a way to email strangers.
  if (user.tree.isDemo) {
    return NextResponse.json({ error: "Demo families can't send invitations. Start your own tree to invite relatives." }, { status: 403 });
  }
  if (!canSendSignIn()) return NextResponse.json({ error: "Email is being set up. Try again soon." }, { status: 503 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  if (!rateLimit(`invite:${user.id}`, 20, 60 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many invitations for now. Try again later." }, { status: 429 });
  }
  if (parsed.data.email === user.email) return NextResponse.json({ error: "That is your own email." }, { status: 400 });

  const root = await prisma.person.findFirst({ where: { treeId: user.tree.id, isRoot: true } });
  const fromName = root ? displayName(root) : user.email;

  let invitee: { name: string; hi: string; en: string } | null = null;
  let invitePersonId = "";
  if (parsed.data.personId) {
    const person = await prisma.person.findUnique({ where: { id: parsed.data.personId } });
    if (!person || person.treeId !== user.tree.id || person.isRoot) {
      return NextResponse.json({ error: "Choose someone in your tree." }, { status: 400 });
    }
    const [people, rels] = await Promise.all([
      prisma.person.findMany({ where: { treeId: user.tree.id }, select: { id: true, gender: true, birthYear: true } }),
      prisma.relationship.findMany({ where: { treeId: user.tree.id } }),
    ]);
    const k = root ? kinship(root.id, person.id, people, rels) : null;
    invitee = { name: displayName(person), hi: k?.hi ?? "", en: k?.en ?? "" };
    invitePersonId = person.id;
  }

  const token = generateToken();
  const previewToken = generateToken();
  await prisma.authChallenge.create({
    data: {
      email: parsed.data.email,
      type: "MAGIC",
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      previewToken,
      invitePersonId,
    },
  });
  await withOrigin(appUrlFromRequest(req), () =>
    deliverMail(inviteMail(parsed.data.email, fromName, token, previewToken, invitee)),
  );
  return NextResponse.json({
    ok: true,
    delivery: emailReady() ? "email" : "letterbox",
    previewToken: letterboxAllowed() ? previewToken : undefined,
  });
}
