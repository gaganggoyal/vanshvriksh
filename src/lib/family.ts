import { prisma } from "./db";
import { mergeFamilies } from "./extended";
import { kinship, type Kin } from "./kinship";
import { displayName, initials } from "./names";
import { ownerPerson, publicPerson } from "./privacy";

/** Trees joined to this one by at least one confirmed match (one hop — their links are theirs to share). */
export async function linkedTreeIds(treeId: string) {
  const rows = await prisma.match.findMany({
    where: { status: "CONFIRMED", OR: [{ personA: { treeId } }, { personB: { treeId } }] },
    include: { personA: { select: { treeId: true } }, personB: { select: { treeId: true } } },
  });
  const ids = new Set<string>();
  for (const r of rows) {
    if (r.personA.treeId !== treeId) ids.add(r.personA.treeId);
    if (r.personB.treeId !== treeId) ids.add(r.personB.treeId);
  }
  return [...ids];
}

async function confirmedLinksAmong(treeIds: string[]) {
  const rows = await prisma.match.findMany({
    where: { status: "CONFIRMED", personA: { treeId: { in: treeIds } }, personB: { treeId: { in: treeIds } } },
    select: { personAId: true, personBId: true },
  });
  return rows.map((r) => [r.personAId, r.personBId] as [string, string]);
}

async function familyLabel(treeId: string) {
  const root = await prisma.person.findFirst({ where: { treeId, isRoot: true } });
  return root ? displayName(root) : "Another family";
}

/**
 * Your tree plus every linked family's people, merged where a confirmed
 * match says two records are one person. Your people carry your private
 * fields; theirs carry names and places only — never dates or notes.
 */
export async function loadExtendedFamily(treeId: string) {
  const linked = await linkedTreeIds(treeId);
  const treeIds = [treeId, ...linked];
  const [people, rels, links] = await Promise.all([
    prisma.person.findMany({ where: { treeId: { in: treeIds } }, orderBy: { createdAt: "asc" } }),
    prisma.relationship.findMany({ where: { treeId: { in: treeIds } } }),
    confirmedLinksAmong(treeIds),
  ]);
  const merged = mergeFamilies({ myTreeId: treeId, people, rels, links });
  const labels = new Map(await Promise.all(linked.map(async (id) => [id, await familyLabel(id)] as const)));

  const out = merged.people.map((p) => {
    if (p.treeId === treeId) {
      return { ...ownerPerson(p), displayName: displayName(p), initials: initials(p), external: false, family: null as string | null };
    }
    return { ...publicPerson(p), external: true, family: labels.get(p.treeId) ?? null };
  });

  const linkedFamilies = linked.map((id) => ({
    treeId: id,
    label: labels.get(id) ?? "",
    adds: merged.people.filter((p) => p.treeId === id).length,
  }));

  return {
    people: out,
    relationships: merged.rels,
    linkedFamilies,
  };
}

export type Bridge = {
  /** How the other tree's writer is related to you, e.g. "मामा". */
  term: Kin | null;
  /** Their writer's name — only once the link is confirmed. */
  name: string | null;
  /** People in their tree who would join (or have joined) your extended family. */
  adds: number;
  /** Their writer is a woman — Hindi agrees the possessive with her (आपकी भांजी, not आपके). */
  female: boolean;
};

/**
 * Read the relationship across a match: merge both trees through their
 * confirmed links (plus the proposed one, for a pending match) and ask what
 * the other tree's writer is to you.
 */
export async function bridgeBetween(
  myTreeId: string,
  theirTreeId: string,
  proposed: [string, string] | null,
  reveal: boolean,
  cache = new Map<string, Awaited<ReturnType<typeof loadTree>>>(),
): Promise<Bridge> {
  const [mine, theirs] = await Promise.all([cachedTree(myTreeId, cache), cachedTree(theirTreeId, cache)]);
  const links = await confirmedLinksAmong([myTreeId, theirTreeId]);
  if (proposed) links.push(proposed);
  const merged = mergeFamilies({
    myTreeId,
    people: [...mine.people, ...theirs.people],
    rels: [...mine.rels, ...theirs.rels],
    links,
  });
  const myRoot = mine.people.find((p) => p.isRoot);
  const theirRoot = theirs.people.find((p) => p.isRoot);
  const adds = merged.people.filter((p) => p.treeId === theirTreeId).length;
  if (!myRoot || !theirRoot) return { term: null, name: null, adds, female: false };
  const term = kinship(
    myRoot.id,
    merged.aliases.get(theirRoot.id) ?? theirRoot.id,
    merged.people.map((p) => ({ id: p.id, gender: p.gender, birthYear: p.birthYear })),
    merged.rels,
  );
  // Their writer merging into you means a duplicate of yourself, not a relative.
  const related = term && term.path.length > 0 ? term : null;
  return { term: related, name: reveal ? displayName(theirRoot) : null, adds, female: theirRoot.gender === "FEMALE" };
}

async function loadTree(treeId: string) {
  const [people, rels] = await Promise.all([
    prisma.person.findMany({ where: { treeId } }),
    prisma.relationship.findMany({ where: { treeId } }),
  ]);
  return { people, rels };
}

async function cachedTree(treeId: string, cache: Map<string, Awaited<ReturnType<typeof loadTree>>>) {
  if (!cache.has(treeId)) cache.set(treeId, await loadTree(treeId));
  return cache.get(treeId)!;
}

