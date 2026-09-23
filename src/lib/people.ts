import { prisma } from "./db";
import { buildSearchKey, canonicalizeToken, normalizeName, phoneticKey, transliterate } from "./names";
import { birthYearFromDate } from "./privacy";
import { scanPersonMatches } from "./matching";
import { notifyKinFound } from "./notify";

export type PersonInput = {
  givenName: string;
  familyName?: string;
  nativeName?: string;
  alsoKnownAs?: string;
  gender?: string;
  birthDate?: string | null;
  birthPlace?: string;
  deathDate?: string | null;
  isLiving?: boolean;
  gotra?: string;
  village?: string;
  notes?: string;
};

export function preparePerson(input: PersonInput) {
  const givenName = input.givenName.trim();
  const familyName = (input.familyName ?? "").trim();
  const birthDate = input.birthDate || null;
  return {
    givenName,
    familyName,
    nativeName: (input.nativeName ?? "").trim(),
    alsoKnownAs: (input.alsoKnownAs ?? "").trim(),
    gender: input.gender ?? "UNKNOWN",
    birthDate,
    birthYear: birthYearFromDate(birthDate),
    birthPlace: (input.birthPlace ?? "").trim(),
    deathDate: input.deathDate || null,
    isLiving: input.isLiving ?? !input.deathDate,
    gotra: (input.gotra ?? "").trim(),
    village: (input.village ?? "").trim(),
    notes: (input.notes ?? "").trim(),
    ...searchFields({ givenName, familyName, nativeName: input.nativeName, alsoKnownAs: input.alsoKnownAs, village: input.village, gotra: input.gotra }),
  };
}

/** Derived keys used to find a person again: blocking keys for matching, phonetic bag for search. */
export function searchFields(p: {
  givenName: string;
  familyName?: string | null;
  nativeName?: string | null;
  alsoKnownAs?: string | null;
  village?: string | null;
  gotra?: string | null;
}) {
  const first = normalizeName(transliterate(p.givenName)).split(" ")[0] ?? "";
  return {
    normalizedGiven: first ? phoneticKey(canonicalizeToken(first)) : "",
    normalizedFamily: phoneticKey(normalizeName(transliterate(p.familyName ?? "")).replace(/\s+/g, "")),
    searchKey: buildSearchKey(p),
  };
}

async function rescan(personId: string) {
  const found = await scanPersonMatches(personId);
  await notifyKinFound(found);
}

export async function createPerson(treeId: string, input: PersonInput, isRoot = false, scan = true) {
  const person = await prisma.person.create({
    data: { treeId, isRoot, ...preparePerson(input) },
  });
  if (scan) await rescan(person.id);
  return person;
}

export async function updatePerson(id: string, input: Partial<PersonInput>) {
  const current = await prisma.person.findUnique({ where: { id } });
  if (!current) return null;
  const merged = preparePerson({
    givenName: input.givenName ?? current.givenName,
    familyName: input.familyName ?? current.familyName,
    nativeName: input.nativeName ?? current.nativeName,
    alsoKnownAs: input.alsoKnownAs ?? current.alsoKnownAs,
    gender: input.gender ?? current.gender,
    birthDate: input.birthDate === undefined ? current.birthDate : input.birthDate,
    birthPlace: input.birthPlace ?? current.birthPlace,
    deathDate: input.deathDate === undefined ? current.deathDate : input.deathDate,
    isLiving: input.isLiving ?? current.isLiving,
    gotra: input.gotra ?? current.gotra,
    village: input.village ?? current.village,
    notes: input.notes ?? current.notes,
  });
  const person = await prisma.person.update({ where: { id }, data: merged });
  await rescan(person.id);
  return person;
}

async function link(treeId: string, type: "PARENT_OF" | "SPOUSE_OF", fromId: string, toId: string) {
  const [a, b] = type === "SPOUSE_OF" && fromId > toId ? [toId, fromId] : [fromId, toId];
  await prisma.relationship.upsert({
    where: { type_fromId_toId: { type, fromId: a, toId: b } },
    create: { treeId, type, fromId: a, toId: b },
    update: {},
  });
}

export async function addRelative(
  treeId: string,
  focusId: string,
  relation: "father" | "mother" | "spouse" | "child" | "sibling",
  input: PersonInput,
) {
  const genderDefault =
    relation === "father" ? "MALE" : relation === "mother" ? "FEMALE" : input.gender ?? "UNKNOWN";
  // Scan once at the end, after the links exist, so shared relatives count.
  const created = await createPerson(treeId, { ...input, gender: input.gender ?? genderDefault }, false, false);

  if (relation === "father" || relation === "mother") {
    await link(treeId, "PARENT_OF", created.id, focusId);
    const otherParents = await prisma.relationship.findMany({
      where: { type: "PARENT_OF", toId: focusId, fromId: { not: created.id } },
    });
    for (const p of otherParents) {
      await link(treeId, "SPOUSE_OF", created.id, p.fromId);
    }
  }

  if (relation === "spouse") {
    await link(treeId, "SPOUSE_OF", focusId, created.id);
  }

  if (relation === "child") {
    await link(treeId, "PARENT_OF", focusId, created.id);
    const spouses = await prisma.relationship.findMany({
      where: { type: "SPOUSE_OF", OR: [{ fromId: focusId }, { toId: focusId }] },
    });
    const spouseId = spouses[0]
      ? spouses[0].fromId === focusId
        ? spouses[0].toId
        : spouses[0].fromId
      : null;
    if (spouseId) await link(treeId, "PARENT_OF", spouseId, created.id);
  }

  if (relation === "sibling") {
    const pars = await prisma.relationship.findMany({
      where: { type: "PARENT_OF", toId: focusId },
    });
    if (pars.length) {
      for (const p of pars) await link(treeId, "PARENT_OF", p.fromId, created.id);
    } else {
      const parent = await createPerson(treeId, {
        givenName: "Parent",
        nativeName: "अभिभावक",
        familyName: input.familyName ?? "",
        gender: "UNKNOWN",
      });
      await link(treeId, "PARENT_OF", parent.id, focusId);
      await link(treeId, "PARENT_OF", parent.id, created.id);
    }
  }

  await rescan(created.id);
  return created;
}
