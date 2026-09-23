import { prisma } from "./db";
import { bestNameScore, displayName, nameTokens, normalizeName, phoneticKey, transliterate } from "./names";

export type MatchReason = {
  code: string;
  label: string;
  weight: number;
};

export type ScoredMatch = {
  score: number;
  reasons: MatchReason[];
  reject?: string;
};

const THRESHOLD = 58;

function parseDate(value?: string | null) {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]), raw: value };
}

function yearOf(person: { birthDate?: string | null; birthYear?: number | null }) {
  if (person.birthYear) return person.birthYear;
  const d = parseDate(person.birthDate);
  return d?.y ?? null;
}

type RelBundle = {
  parentNames: string[];
  spouseNames: string[];
  childNames: string[];
};

export function nameKeys(value: string) {
  const latin = transliterate(value);
  const tokens = nameTokens(latin);
  const keys = new Set<string>();
  if (!tokens.length) return keys;
  keys.add(tokens.join(" "));
  if (tokens.length >= 2) {
    keys.add([tokens[0] + tokens[1], ...tokens.slice(2)].join(" "));
  }
  // Spelling- and script-insensitive: "Kamla Devi", "Kamala Devi", "कमला देवी" share one key.
  const sound = phoneticKey(normalizeName(latin).replace(/\s+/g, ""));
  if (sound.length >= 3) keys.add(`~${sound}`);
  return keys;
}

function overlapCount(a: string[], b: string[]) {
  const bn = new Set<string>();
  for (const name of b) for (const k of nameKeys(name)) if (k) bn.add(k);
  return a.filter((name) => [...nameKeys(name)].some((k) => k && bn.has(k))).length;
}

export function sharedNames(a: string[], b: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const left of a) {
    const keys = nameKeys(left);
    if (![...keys].some(Boolean) || [...keys].some((k) => seen.has(k))) continue;
    const hit = b.find((right) => [...nameKeys(right)].some((k) => keys.has(k)));
    if (hit) {
      for (const k of keys) seen.add(k);
      out.push(left);
    }
  }
  return out;
}

export function scorePair(
  a: {
    givenName: string;
    familyName?: string | null;
    alsoKnownAs?: string | null;
    nativeName?: string | null;
    gender?: string | null;
    birthDate?: string | null;
    birthYear?: number | null;
    village?: string | null;
    gotra?: string | null;
  },
  b: typeof a,
  relA: RelBundle,
  relB: RelBundle,
): ScoredMatch {
  const reasons: MatchReason[] = [];

  if (
    a.gender &&
    b.gender &&
    a.gender !== "UNKNOWN" &&
    b.gender !== "UNKNOWN" &&
    a.gender !== b.gender
  ) {
    return { score: 0, reasons, reject: "gender" };
  }

  const { given, family } = bestNameScore(a, b);
  let score = 0;

  if (given >= 0.97) {
    score += 28;
    reasons.push({ code: "given_exact", label: "Same given name", weight: 28 });
  } else if (given >= 0.88) {
    score += 22;
    reasons.push({ code: "given_close", label: "Very similar given name", weight: 22 });
  } else if (given >= 0.78) {
    score += 14;
    reasons.push({ code: "given_similar", label: "Similar given name", weight: 14 });
  }

  if (family >= 0.95 && (a.familyName || b.familyName)) {
    score += 12;
    reasons.push({ code: "family_exact", label: "Same family name", weight: 12 });
  } else if (family >= 0.82 && (a.familyName || b.familyName)) {
    score += 7;
    reasons.push({ code: "family_close", label: "Similar family name", weight: 7 });
  }

  const da = parseDate(a.birthDate);
  const db = parseDate(b.birthDate);
  const ya = yearOf(a);
  const yb = yearOf(b);

  if (da && db) {
    if (da.raw === db.raw) {
      score += 36;
      reasons.push({ code: "dob_exact", label: "Matching life dates (private)", weight: 36 });
    } else if (da.y === db.y && da.mo === db.mo) {
      score += 24;
      reasons.push({ code: "dob_month", label: "Matching life dates (private)", weight: 24 });
    } else if (da.y === db.y) {
      score += 16;
      reasons.push({ code: "dob_year", label: "Matching life dates (private)", weight: 16 });
    } else if (Math.abs(da.y - db.y) === 1) {
      score += 8;
      reasons.push({ code: "dob_near", label: "Close life dates (private)", weight: 8 });
    } else if (Math.abs(da.y - db.y) > 5 && given < 0.97) {
      return { score: 0, reasons, reject: "dob_conflict" };
    } else if (Math.abs(da.y - db.y) > 12) {
      return { score: 0, reasons, reject: "dob_conflict" };
    }
  } else if (ya && yb) {
    if (ya === yb) {
      score += 16;
      reasons.push({ code: "year_exact", label: "Matching life dates (private)", weight: 16 });
    } else if (Math.abs(ya - yb) === 1) {
      score += 8;
      reasons.push({ code: "year_near", label: "Close life dates (private)", weight: 8 });
    } else if (Math.abs(ya - yb) > 12) {
      return { score: 0, reasons, reject: "dob_conflict" };
    }
  }

  if (a.gender && b.gender && a.gender !== "UNKNOWN" && a.gender === b.gender) {
    score += 4;
    reasons.push({ code: "gender", label: "Same gender", weight: 4 });
  }

  const villageScore = bestNameScore(
    { givenName: a.village ?? "" },
    { givenName: b.village ?? "" },
  ).given;
  if ((a.village || b.village) && villageScore >= 0.9) {
    score += 8;
    reasons.push({ code: "village", label: "Same village / native place", weight: 8 });
  }

  if (a.gotra && b.gotra && phoneticKey(a.gotra) && phoneticKey(a.gotra) === phoneticKey(b.gotra)) {
    score += 6;
    reasons.push({ code: "gotra", label: "Same gotra", weight: 6 });
  }

  const parents = overlapCount(relA.parentNames, relB.parentNames);
  const spouses = overlapCount(relA.spouseNames, relB.spouseNames);
  const children = overlapCount(relA.childNames, relB.childNames);
  const relHits = parents + spouses + children;
  if (relHits > 0) {
    const w = Math.min(28, 10 * parents + 10 * spouses + 8 * children);
    score += w;
    const bits: string[] = [];
    if (parents) bits.push("parents");
    if (spouses) bits.push("spouse");
    if (children) bits.push("children");
    reasons.push({
      code: "relatives",
      label: `Shared relatives (${bits.join(", ")})`,
      weight: w,
    });
  }

  if (given < 0.72 && relHits === 0) {
    return { score: 0, reasons, reject: "weak_name" };
  }

  return { score, reasons };
}

export function publicReasons(reasons: MatchReason[]) {
  return reasons.filter((r) => !r.code.startsWith("dob") && !r.code.startsWith("year"));
}

type PersonRow = {
  id: string;
  treeId: string;
  givenName: string;
  familyName: string;
  nativeName: string;
  alsoKnownAs: string;
  gender: string;
  birthDate: string | null;
  birthYear: number | null;
  village: string;
  gotra: string;
  normalizedGiven: string;
  normalizedFamily: string;
};

/** Parent / spouse / child names for many people in three queries instead of four per person. */
async function relativesOfMany(ids: string[]): Promise<Map<string, RelBundle>> {
  const out = new Map<string, RelBundle>();
  for (const id of ids) out.set(id, { parentNames: [], spouseNames: [], childNames: [] });
  if (!ids.length) return out;
  const rels = await prisma.relationship.findMany({
    where: { OR: [{ fromId: { in: ids } }, { toId: { in: ids } }] },
    select: { type: true, fromId: true, toId: true },
  });
  const otherIds = new Set<string>();
  for (const r of rels) {
    otherIds.add(r.fromId);
    otherIds.add(r.toId);
  }
  const people = await prisma.person.findMany({
    where: { id: { in: [...otherIds] } },
    select: { id: true, givenName: true, familyName: true, nativeName: true },
  });
  const nameOf = new Map(people.map((p) => [p.id, displayName(p)]));
  for (const r of rels) {
    const from = nameOf.get(r.fromId);
    const to = nameOf.get(r.toId);
    if (!from || !to) continue;
    if (r.type === "PARENT_OF") {
      out.get(r.fromId)?.childNames.push(to);
      out.get(r.toId)?.parentNames.push(from);
    } else if (r.type === "SPOUSE_OF") {
      out.get(r.fromId)?.spouseNames.push(to);
      out.get(r.toId)?.spouseNames.push(from);
    }
  }
  return out;
}

function orderedPair(a: string, b: string) {
  return a < b ? ([a, b] as const) : ([b, a] as const);
}

/**
 * Candidates from other trees that could plausibly be the same person:
 * same canonical given name, or same family name near the same birth year,
 * or the same birth year with a known name. Uses the (normalized*, birthYear) indexes.
 */
async function candidatesFor(person: PersonRow, isDemo: boolean) {
  const year = person.birthYear;
  const years = year ? [year - 1, year, year + 1] : [];
  const or: object[] = [];
  if (person.normalizedGiven) or.push({ normalizedGiven: person.normalizedGiven });
  if (person.normalizedFamily && years.length) or.push({ normalizedFamily: person.normalizedFamily, birthYear: { in: years } });
  if (person.normalizedFamily && !years.length) or.push({ normalizedFamily: person.normalizedFamily });
  if (years.length) or.push({ birthYear: { in: years } });
  if (!or.length) return [];
  return prisma.person.findMany({
    // Demo families only ever meet other demo families.
    where: { treeId: { not: person.treeId }, tree: { isDemo }, OR: or },
    take: 400,
  });
}

export type NewMatch = { matchId: string; personId: string; otherPersonId: string; otherTreeId: string };

export async function scanPersonMatches(personId: string): Promise<NewMatch[]> {
  const person = await prisma.person.findUnique({ where: { id: personId }, include: { tree: { select: { isDemo: true } } } });
  if (!person) return [];

  const candidates = await candidatesFor(person, person.tree.isDemo);
  const bundles = await relativesOfMany([person.id, ...candidates.map((c) => c.id)]);
  const relA = bundles.get(person.id)!;

  const existing = await prisma.match.findMany({
    where: { OR: [{ personAId: person.id }, { personBId: person.id }] },
  });
  const existingByOther = new Map(existing.map((m) => [m.personAId === person.id ? m.personBId : m.personAId, m]));

  const created: NewMatch[] = [];
  const stillScoring = new Set<string>();

  for (const other of candidates) {
    const scored = scorePair(person, other, relA, bundles.get(other.id)!);
    if (scored.score < THRESHOLD) continue;
    stillScoring.add(other.id);

    const prior = existingByOther.get(other.id);
    if (prior?.status === "DISMISSED" || prior?.status === "CONFIRMED") continue;
    if (prior && prior.source !== "auto") continue;

    const [personAId, personBId] = orderedPair(person.id, other.id);
    const row = await prisma.match.upsert({
      where: { personAId_personBId: { personAId, personBId } },
      create: {
        personAId,
        personBId,
        score: scored.score,
        reasons: JSON.stringify(scored.reasons),
        status: "PENDING",
      },
      update: { score: scored.score, reasons: JSON.stringify(scored.reasons) },
    });
    if (!prior) {
      created.push({ matchId: row.id, personId: person.id, otherPersonId: other.id, otherTreeId: other.treeId });
    }
  }

  // A pending proposal that no longer scores (a corrected date, a renamed person) is withdrawn.
  const stale = existing.filter((m) => {
    const otherId = m.personAId === person.id ? m.personBId : m.personAId;
    return m.status === "PENDING" && m.source === "auto" && !stillScoring.has(otherId);
  });
  if (stale.length) {
    await prisma.match.deleteMany({ where: { id: { in: stale.map((m) => m.id) } } });
  }

  return created;
}

export async function scanTreeMatches(treeId: string) {
  const people = await prisma.person.findMany({ where: { treeId }, select: { id: true } });
  const all: NewMatch[] = [];
  for (const p of people) {
    all.push(...(await scanPersonMatches(p.id)));
  }
  return all;
}

/**
 * Record that two people may be (or are) the same human, from a human action
 * rather than the scorer — a search result or an invitation. `by` is the user
 * vouching for it; the link is CONFIRMED once both tree owners have vouched.
 */
export async function linkPersons(
  aId: string,
  bId: string,
  opts: { by: string[]; source: "search" | "invite"; reason: string },
) {
  const [a, b] = await Promise.all([
    prisma.person.findUnique({ where: { id: aId }, include: { tree: true } }),
    prisma.person.findUnique({ where: { id: bId }, include: { tree: true } }),
  ]);
  if (!a || !b || a.treeId === b.treeId || a.tree.isDemo !== b.tree.isDemo) return null;
  const [personAId, personBId] = orderedPair(a.id, b.id);
  const existing = await prisma.match.findUnique({ where: { personAId_personBId: { personAId, personBId } } });
  if (existing?.status === "DISMISSED") return { match: existing, dismissed: true as const };

  const bundles = await relativesOfMany([a.id, b.id]);
  const scored = scorePair(a, b, bundles.get(a.id)!, bundles.get(b.id)!);
  const reasons = [{ code: opts.source, label: opts.reason, weight: 0 }, ...scored.reasons];
  const confirmedBy = new Set([...(existing?.confirmedBy ?? "").split(",").filter(Boolean), ...opts.by]);
  const both = confirmedBy.has(a.tree.userId) && confirmedBy.has(b.tree.userId);
  const status = existing?.status === "CONFIRMED" || both ? "CONFIRMED" : "PENDING";

  const match = await prisma.match.upsert({
    where: { personAId_personBId: { personAId, personBId } },
    create: {
      personAId,
      personBId,
      score: scored.score,
      reasons: JSON.stringify(reasons),
      status,
      confirmedBy: [...confirmedBy].join(","),
      source: opts.source,
    },
    update: {
      status,
      confirmedBy: [...confirmedBy].join(","),
      source: existing?.source === "auto" ? opts.source : undefined,
      reasons: JSON.stringify(reasons),
    },
  });
  return { match, created: !existing, dismissed: false as const };
}
