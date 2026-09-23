export type Rel = { type: string; fromId: string; toId: string };

export function buildGraph(peopleIds: string[], rels: Rel[]) {
  const parents: Record<string, string[]> = {};
  const children: Record<string, string[]> = {};
  const spouses: Record<string, string[]> = {};
  const ensure = (id: string) => {
    parents[id] ??= [];
    children[id] ??= [];
    spouses[id] ??= [];
  };
  for (const id of peopleIds) ensure(id);
  for (const r of rels) {
    ensure(r.fromId);
    ensure(r.toId);
    if (r.type === "PARENT_OF") {
      if (!children[r.fromId].includes(r.toId)) children[r.fromId].push(r.toId);
      if (!parents[r.toId].includes(r.fromId)) parents[r.toId].push(r.fromId);
    }
    if (r.type === "SPOUSE_OF") {
      if (!spouses[r.fromId].includes(r.toId)) spouses[r.fromId].push(r.toId);
      if (!spouses[r.toId].includes(r.fromId)) spouses[r.toId].push(r.fromId);
    }
  }
  return { parents, children, spouses };
}
