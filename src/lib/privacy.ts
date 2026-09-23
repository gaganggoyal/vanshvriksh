import { displayName, initials } from "./names";

export type PersonRecord = {
  id: string;
  treeId: string;
  isRoot: boolean;
  givenName: string;
  familyName: string;
  nativeName: string;
  alsoKnownAs: string;
  gender: string;
  birthDate?: string | null;
  birthYear?: number | null;
  birthPlace: string;
  deathDate?: string | null;
  isLiving: boolean;
  gotra: string;
  village: string;
  notes: string;
  claimedByUserId?: string | null;
};

export function publicPerson(p: PersonRecord) {
  return {
    id: p.id,
    treeId: p.treeId,
    isRoot: p.isRoot,
    givenName: p.givenName,
    familyName: p.familyName,
    nativeName: p.nativeName,
    alsoKnownAs: p.alsoKnownAs,
    gender: p.gender,
    isLiving: p.isLiving,
    gotra: p.gotra,
    village: p.village,
    displayName: displayName(p),
    initials: initials(p),
    claimed: Boolean(p.claimedByUserId),
  };
}

export function ownerPerson(p: PersonRecord) {
  return {
    ...publicPerson(p),
    birthDate: p.birthDate ?? null,
    birthYear: p.birthYear ?? null,
    birthPlace: p.birthPlace,
    deathDate: p.deathDate ?? null,
    notes: p.notes,
  };
}

export function birthYearFromDate(date?: string | null) {
  if (!date) return null;
  const y = Number(date.slice(0, 4));
  return Number.isFinite(y) ? y : null;
}
