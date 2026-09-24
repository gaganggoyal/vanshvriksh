import { prisma } from "./db";
import { buildGraph } from "./graph";
import { displayName } from "./names";

/** Names of a person's parents, spouses and children — what two families compare first. */
export async function neighbours(personId: string) {
  const empty = { all: [] as string[], groups: { parents: [] as string[], spouses: [] as string[], children: [] as string[] } };
  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person) return empty;
  const people = await prisma.person.findMany({ where: { treeId: person.treeId } });
  const rels = await prisma.relationship.findMany({ where: { treeId: person.treeId } });
  const g = buildGraph(
    people.map((p) => p.id),
    rels,
  );
  const byId = new Map(people.map((p) => [p.id, p]));
  const names = (ids: string[]) => ids.map((id) => byId.get(id)).filter(Boolean).map((p) => displayName(p!));
  const groups = {
    parents: names(g.parents[personId] ?? []),
    spouses: names(g.spouses[personId] ?? []),
    children: names(g.children[personId] ?? []),
  };
  return { all: [...groups.parents, ...groups.spouses, ...groups.children], groups };
}
