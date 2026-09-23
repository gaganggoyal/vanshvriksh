import type { Rel } from "./graph";

/**
 * Extended family: your tree joined to the trees you have a confirmed link
 * with. A confirmed match says "this person in your tree is that person in
 * theirs", so the two records become one node; every relationship either
 * family wrote then hangs off the same graph and kinship reads straight across.
 */

export type MergeInput<P extends { id: string; treeId: string }> = {
  myTreeId: string;
  people: P[];
  rels: Rel[];
  /** Pairs of person ids known to be the same human. */
  links: [string, string][];
};

export function mergeFamilies<P extends { id: string; treeId: string }>({ myTreeId, people, rels, links }: MergeInput<P>) {
  const byId = new Map(people.map((p) => [p.id, p]));
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.has(r) && parent.get(r) !== r) r = parent.get(r)!;
    let c = x;
    while (c !== r) {
      const n = parent.get(c)!;
      parent.set(c, r);
      c = n;
    }
    return r;
  };
  // The surviving id is always your own record when one exists, so edits keep working.
  const rank = (id: string) => (byId.get(id)?.treeId === myTreeId ? 0 : 1);
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return;
    const [keep, drop] = rank(ra) < rank(rb) || (rank(ra) === rank(rb) && ra < rb) ? [ra, rb] : [rb, ra];
    parent.set(drop, keep);
  };
  for (const p of people) parent.set(p.id, p.id);
  for (const [a, b] of links) if (byId.has(a) && byId.has(b)) union(a, b);

  const aliases = new Map<string, string>();
  const merged: P[] = [];
  for (const p of people) {
    const root = find(p.id);
    aliases.set(p.id, root);
    if (root === p.id) merged.push(p);
  }

  const seen = new Set<string>();
  const outRels: Rel[] = [];
  for (const r of rels) {
    const fromId = aliases.get(r.fromId);
    const toId = aliases.get(r.toId);
    if (!fromId || !toId || fromId === toId) continue;
    const key = r.type === "SPOUSE_OF" ? `S:${[fromId, toId].sort().join()}` : `P:${fromId}>${toId}`;
    if (seen.has(key)) continue;
    // Two families can disagree (A is B's parent here, B is A's parent there); keep the first reading.
    if (r.type === "PARENT_OF" && seen.has(`P:${toId}>${fromId}`)) continue;
    seen.add(key);
    outRels.push({ type: r.type, fromId, toId });
  }

  return { people: merged, rels: outRels, aliases };
}
