import { prisma } from "./db";
import { buildGraph } from "./graph";
import { linkedTreeIds } from "./family";
import { displayName, initials, queryKeys } from "./names";

/**
 * Finding relatives across families, privately.
 *
 * - Only trees that allow discovery are searched.
 * - Remembered (departed) people can be found by name, place or gotra.
 * - A living person is found only when the searcher already knows their birth
 *   year (±1). The year is checked against the private record and never shown.
 * - Around each result we name remembered relatives only; living ones are counted.
 * - No result ever carries a date.
 */

export type SearchInput = {
  query: string;
  birthYear?: number | null;
  viewerTreeId?: string | null;
  /** Demo viewers search demo families only; everyone else never sees them. */
  viewerIsDemo?: boolean;
  limit?: number;
};

type Candidate = Awaited<ReturnType<typeof fetchCandidates>>[number];

async function fetchCandidates(keys: string[], birthYear: number | null, viewerTreeId: string | null, isDemo = false) {
  const visibility = birthYear
    ? { OR: [{ isLiving: false }, { isLiving: true, birthYear: { in: [birthYear - 1, birthYear, birthYear + 1] } }] }
    : { isLiving: false };
  return prisma.person.findMany({
    where: {
      AND: [
        ...keys.map((k) => ({ searchKey: { contains: ` ${k}` } })),
        visibility,
        { tree: { discoverable: true, isDemo } },
        viewerTreeId ? { treeId: { not: viewerTreeId } } : {},
      ],
    },
    take: 200,
  });
}

/** Can this viewer see this person in search at all? Same rules as the query. */
export function visibleInSearch(
  p: { isLiving: boolean; birthYear: number | null },
  discoverable: boolean,
  birthYear?: number | null,
) {
  if (!discoverable) return false;
  if (!p.isLiving) return true;
  return Boolean(birthYear && p.birthYear && Math.abs(p.birthYear - birthYear) <= 1);
}

function relevance(p: Candidate, keys: string[]) {
  const own = ` ${p.searchKey} `;
  let exact = 0;
  for (const k of keys) if (own.includes(` ${k} `)) exact++;
  return exact;
}

export async function searchRelatives({ query, birthYear = null, viewerTreeId = null, viewerIsDemo = false, limit = 30 }: SearchInput) {
  const keys = queryKeys(query).filter((k) => k.length >= 2);
  if (!keys.length) return [];
  const rows = await fetchCandidates(keys, birthYear, viewerTreeId, viewerIsDemo);
  rows.sort((a, b) => relevance(b, keys) - relevance(a, keys) || Number(a.isLiving) - Number(b.isLiving));
  const top = rows.slice(0, limit);
  if (!top.length) return [];

  const treeIds = [...new Set(top.map((p) => p.treeId))];
  const [people, rels, sizes] = await Promise.all([
    prisma.person.findMany({
      where: { treeId: { in: treeIds } },
      select: { id: true, treeId: true, givenName: true, familyName: true, nativeName: true, isLiving: true },
    }),
    prisma.relationship.findMany({ where: { treeId: { in: treeIds } }, select: { type: true, fromId: true, toId: true } }),
    prisma.person.groupBy({ by: ["treeId"], where: { treeId: { in: treeIds } }, _count: { _all: true } }),
  ]);
  const byId = new Map(people.map((p) => [p.id, p]));
  const g = buildGraph(
    people.map((p) => p.id),
    rels,
  );
  const sizeOf = new Map(sizes.map((s) => [s.treeId, s._count._all]));

  // What the viewer already has going with each result.
  const viewerLinks = viewerTreeId
    ? await prisma.match.findMany({
        where: {
          OR: [
            { personAId: { in: top.map((p) => p.id) }, personB: { treeId: viewerTreeId } },
            { personBId: { in: top.map((p) => p.id) }, personA: { treeId: viewerTreeId } },
          ],
        },
      })
    : [];
  const linkedTrees = new Set(viewerTreeId ? await linkedTreeIds(viewerTreeId) : []);
  const linkState = new Map<string, string>();
  for (const m of viewerLinks) {
    const theirs = top.some((p) => p.id === m.personAId) ? m.personAId : m.personBId;
    linkState.set(theirs, m.status);
  }

  const around = (ids: string[]) => {
    const named: string[] = [];
    let living = 0;
    for (const id of ids) {
      const r = byId.get(id);
      if (!r) continue;
      if (r.isLiving) living++;
      else named.push(displayName(r));
    }
    return { named, living };
  };

  return top.map((p) => {
    const parents = around(g.parents[p.id] ?? []);
    const spouses = around(g.spouses[p.id] ?? []);
    const children = around(g.children[p.id] ?? []);
    return {
      id: p.id,
      displayName: displayName(p),
      nativeName: p.nativeName,
      initials: initials(p),
      gender: p.gender,
      isLiving: p.isLiving,
      village: p.village,
      gotra: p.gotra,
      familySize: sizeOf.get(p.treeId) ?? 1,
      around: {
        parents: parents.named,
        spouses: spouses.named,
        children: children.named,
        livingRelatives: parents.living + spouses.living + children.living,
      },
      // Already reachable through a family you are linked with — nothing to ask.
      status: linkState.get(p.id) ?? (linkedTrees.has(p.treeId) ? "LINKED_FAMILY" : null),
    };
  });
}

/**
 * Public, signed-out view: how many remembered people, families and places
 * answer to a name — counts only, nothing that identifies anyone.
 */
export async function publicTeaser(query: string) {
  const keys = queryKeys(query).filter((k) => k.length >= 2);
  if (!keys.length) return { people: 0, families: 0, places: [] as string[] };
  const rows = await fetchCandidates(keys, null, null);
  const places = new Map<string, number>();
  for (const r of rows) if (r.village) places.set(r.village, (places.get(r.village) ?? 0) + 1);
  return {
    people: rows.length,
    families: new Set(rows.map((r) => r.treeId)).size,
    places: [...places.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([v]) => v),
  };
}

/** Villages and gotras remembered across discoverable families, for browsing. */
export async function commonPlaces(limit = 12, isDemo = false) {
  const where = { isLiving: false, tree: { discoverable: true, isDemo } };
  const [villages, gotras] = await Promise.all([
    prisma.person.groupBy({ by: ["village"], where: { ...where, village: { not: "" } }, _count: { _all: true } }),
    prisma.person.groupBy({ by: ["gotra"], where: { ...where, gotra: { not: "" } }, _count: { _all: true } }),
  ]);
  const top = <T extends { _count: { _all: number } }>(rows: T[]) =>
    rows.sort((a, b) => b._count._all - a._count._all).slice(0, limit);
  return {
    villages: top(villages).map((v) => ({ name: v.village, count: v._count._all })),
    gotras: top(gotras).map((g) => ({ name: g.gotra, count: g._count._all })),
  };
}

export async function siteStats() {
  // Real families only — the demo is a showroom, not a number to boast.
  const real = { tree: { isDemo: false } };
  const [families, people, remembered, linked] = await Promise.all([
    prisma.tree.count({ where: { isDemo: false } }),
    prisma.person.count({ where: real }),
    prisma.person.count({ where: { ...real, isLiving: false } }),
    prisma.match.count({ where: { status: "CONFIRMED", personA: real } }),
  ]);
  return { families, people, remembered, linked };
}
