import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { kinship } from "@/lib/kinship";
import { linkPersons } from "@/lib/matching";
import { displayName } from "@/lib/names";
import { createPerson } from "@/lib/people";

const schema = z.object({
  givenName: z.string().min(1),
  familyName: z.string().optional().default(""),
  nativeName: z.string().optional().default(""),
  alsoKnownAs: z.string().optional().default(""),
  gender: z.enum(["FEMALE", "MALE", "OTHER", "UNKNOWN"]).default("UNKNOWN"),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  birthPlace: z.string().optional().default(""),
  village: z.string().optional().default(""),
  gotra: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  locale: z.enum(["en", "hi"]).optional(),
  /** Accept the invitation's link to the inviter's tree (default yes). */
  linkInvite: z.boolean().optional().default(true),
});

async function invitation(personId: string) {
  if (!personId) return null;
  const person = await prisma.person.findUnique({ where: { id: personId }, include: { tree: true } });
  if (!person) return null;
  const [root, people, rels] = await Promise.all([
    prisma.person.findFirst({ where: { treeId: person.treeId, isRoot: true } }),
    prisma.person.findMany({ where: { treeId: person.treeId }, select: { id: true, gender: true, birthYear: true } }),
    prisma.relationship.findMany({ where: { treeId: person.treeId } }),
  ]);
  const k = root ? kinship(root.id, person.id, people, rels) : null;
  return { person, inviter: root ? displayName(root) : "", inviterUserId: person.tree.userId, hi: k?.hi ?? "", en: k?.en ?? "" };
}

/** What an invitation already knows about you, to start your tree from. Names and places only. */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const inv = await invitation(user.invitePersonId);
  if (!inv) return NextResponse.json({ invite: null });
  const p = inv.person;
  return NextResponse.json({
    invite: {
      inviter: inv.inviter,
      hi: inv.hi,
      en: inv.en,
      prefill: {
        givenName: p.givenName,
        familyName: p.familyName,
        nativeName: p.nativeName,
        alsoKnownAs: p.alsoKnownAs,
        gender: p.gender,
        village: p.village,
        gotra: p.gotra,
      },
    },
  });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (user.tree) return NextResponse.json({ ok: true, already: true });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Tell us your name to begin the tree." }, { status: 400 });
  }

  const tree = await prisma.tree.create({
    data: { userId: user.id, title: `${parsed.data.familyName || parsed.data.givenName} family tree` },
  });
  const person = await createPerson(tree.id, parsed.data, true);
  await prisma.person.update({
    where: { id: person.id },
    data: { claimedByUserId: user.id },
  });
  if (parsed.data.locale) {
    await prisma.user.update({ where: { id: user.id }, data: { locale: parsed.data.locale } });
  }

  // Joining by invitation: both sides have now vouched — the inviter by inviting, you by accepting.
  let linked = false;
  const inv = await invitation(user.invitePersonId);
  if (inv && parsed.data.linkInvite && inv.inviterUserId !== user.id) {
    const res = await linkPersons(person.id, inv.person.id, {
      by: [user.id, inv.inviterUserId],
      source: "invite",
      reason: "Joined by invitation",
    });
    linked = res?.match.status === "CONFIRMED";
  }
  if (user.invitePersonId) await prisma.user.update({ where: { id: user.id }, data: { invitePersonId: "" } });

  return NextResponse.json({ ok: true, personId: person.id, linked });
}
