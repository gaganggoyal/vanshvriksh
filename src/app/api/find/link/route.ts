import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { visibleInSearch } from "@/lib/discover";
import { linkPersons } from "@/lib/matching";
import { notifyKinFound } from "@/lib/notify";
import { addRelative } from "@/lib/people";

const schema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("same"),
    personId: z.string().min(1),
    myPersonId: z.string().min(1),
    birthYear: z.number().int().nullable().optional(),
  }),
  z.object({
    mode: z.literal("add"),
    personId: z.string().min(1),
    focusId: z.string().min(1),
    relation: z.enum(["father", "mother", "spouse", "child", "sibling"]),
    birthYear: z.number().int().nullable().optional(),
  }),
]);

/**
 * "This is my relative." Either they are someone already in your tree
 * (same), or you add them to it (add) — names and places copied, never dates.
 * Either way you have vouched; their family is told and decides.
 */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user?.tree) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose who they are in your tree." }, { status: 400 });
  const body = parsed.data;

  const theirs = await prisma.person.findUnique({ where: { id: body.personId }, include: { tree: true } });
  if (
    !theirs ||
    theirs.treeId === user.tree.id ||
    theirs.tree.isDemo !== user.tree.isDemo ||
    !visibleInSearch(theirs, theirs.tree.discoverable, body.birthYear)
  ) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let mineId: string;
  if (body.mode === "same") {
    const mine = await prisma.person.findUnique({ where: { id: body.myPersonId } });
    if (!mine || mine.treeId !== user.tree.id) return NextResponse.json({ error: "Not found." }, { status: 404 });
    mineId = mine.id;
  } else {
    const focus = await prisma.person.findUnique({ where: { id: body.focusId } });
    if (!focus || focus.treeId !== user.tree.id) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const created = await addRelative(user.tree.id, focus.id, body.relation, {
      givenName: theirs.givenName,
      familyName: theirs.familyName,
      nativeName: theirs.nativeName,
      alsoKnownAs: theirs.alsoKnownAs,
      gender: theirs.gender,
      village: theirs.village,
      gotra: theirs.gotra,
      isLiving: theirs.isLiving,
    });
    mineId = created.id;
  }

  const result = await linkPersons(mineId, theirs.id, {
    by: [user.id],
    source: "search",
    reason: "A family member recognised them",
  });
  if (!result) return NextResponse.json({ error: "Could not link." }, { status: 400 });
  if (result.dismissed) {
    return NextResponse.json({ error: "One of the families already said these are not the same person." }, { status: 409 });
  }
  if (result.match.status === "PENDING") {
    await notifyKinFound([{ matchId: result.match.id, personId: mineId, otherPersonId: theirs.id, otherTreeId: theirs.treeId }]);
  }
  return NextResponse.json({ ok: true, status: result.match.status, personId: mineId, matchId: result.match.id });
}
