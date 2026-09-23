import { buildGraph, type Rel } from "./graph";

export type LayoutPerson = {
  id: string;
  givenName: string;
  familyName: string;
  nativeName: string;
  gender: string;
  isLiving: boolean;
  isRoot: boolean;
  displayName: string;
  initials: string;
  /** From a linked family's tree (read-only, names only). */
  external?: boolean;
};

export type LaidNode = LayoutPerson & {
  x: number;
  y: number;
  /** Generation relative to the focus person: negative above, positive below. */
  gen: number;
};

export type LaidEdge = {
  a: string;
  b: string;
  kind: "parent" | "spouse";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export const NODE_W = 176;
export const NODE_H = 96;
const COUPLE = 22;
const H_GAP = 42;
const V_GAP = 150;
const COMPONENT_GAP = 120;
const PAD = 80;

/**
 * A block is one person plus every spouse drawn beside them. Members are
 * ordered left → right, so member i and i+1 share a marriage line.
 */
type Block = {
  id: string;
  members: string[];
  gen: number;
  width: number;
  /** Centre x while solving. */
  cx: number;
  order: number;
};

type Graph = ReturnType<typeof buildGraph>;

function blockWidth(n: number) {
  return n * NODE_W + Math.max(0, n - 1) * COUPLE;
}

/** Members of a block sorted into a chain so every marriage line is between neighbours. */
function orderMembers(members: string[], g: Graph, byId: Map<string, LayoutPerson>) {
  if (members.length <= 1) return members;
  if (members.length === 2) {
    const [a, b] = members;
    const aMale = byId.get(a)?.gender === "MALE";
    const bMale = byId.get(b)?.gender === "MALE";
    if (aMale && !bMale) return [a, b];
    if (bMale && !aMale) return [b, a];
    return a < b ? [a, b] : [b, a];
  }
  const set = new Set(members);
  const degree = (id: string) => (g.spouses[id] ?? []).filter((s) => set.has(s)).length;
  // Person with the most marriages sits in the middle, partners fan out on both sides.
  const hub = [...members].sort((a, b) => degree(b) - degree(a) || a.localeCompare(b))[0];
  const partners = (g.spouses[hub] ?? []).filter((s) => set.has(s)).sort();
  const rest = members.filter((m) => m !== hub && !partners.includes(m));
  const left = partners.slice(0, Math.ceil(partners.length / 2));
  const right = partners.slice(left.length);
  return [...left, hub, ...right, ...rest];
}

function assignGenerations(seed: string, ids: Set<string>, g: Graph) {
  const gen = new Map<string, number>();
  gen.set(seed, 0);
  const queue = [seed];
  while (queue.length) {
    const cur = queue.shift()!;
    const cg = gen.get(cur)!;
    const visit = (id: string, value: number) => {
      if (!ids.has(id) || gen.has(id)) return;
      gen.set(id, value);
      queue.push(id);
    };
    for (const p of g.parents[cur] ?? []) visit(p, cg - 1);
    for (const c of g.children[cur] ?? []) visit(c, cg + 1);
    for (const s of g.spouses[cur] ?? []) visit(s, cg);
  }
  return gen;
}

function buildBlocks(ids: string[], gen: Map<string, number>, g: Graph, byId: Map<string, LayoutPerson>) {
  const blockOf = new Map<string, Block>();
  const blocks: Block[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) continue;
    // Flood over spouse edges inside the same generation.
    const members: string[] = [];
    const stack = [id];
    seen.add(id);
    while (stack.length) {
      const cur = stack.pop()!;
      members.push(cur);
      for (const s of g.spouses[cur] ?? []) {
        if (seen.has(s) || !gen.has(s) || gen.get(s) !== gen.get(cur)) continue;
        seen.add(s);
        stack.push(s);
      }
    }
    const ordered = orderMembers(members, g, byId);
    const block: Block = {
      id: ordered[0],
      members: ordered,
      gen: gen.get(id)!,
      width: blockWidth(ordered.length),
      cx: 0,
      order: 0,
    };
    blocks.push(block);
    for (const m of ordered) blockOf.set(m, block);
  }
  return { blocks, blockOf };
}

function memberCenter(block: Block, id: string) {
  const i = block.members.indexOf(id);
  return block.cx - block.width / 2 + i * (NODE_W + COUPLE) + NODE_W / 2;
}

/**
 * Least-squares 1-D placement with no-overlap constraints, preserving order
 * (pool-adjacent-violators). Every block wants to sit at `desired`; runs of
 * blocks that would collide are packed together and centred on their mean.
 */
function resolveOverlaps(row: Block[], desired: number[]) {
  type Group = { idx: number[]; center: number; width: number };
  const groups: Group[] = [];
  const widthOf = (idx: number[]) =>
    idx.reduce((sum, i) => sum + row[i].width, 0) + H_GAP * (idx.length - 1);
  const centerOf = (idx: number[]) => {
    // r_i = offset of block i from the group centre when packed left → right.
    const w = widthOf(idx);
    let cursor = -w / 2;
    let sum = 0;
    for (const i of idx) {
      const r = cursor + row[i].width / 2;
      sum += desired[i] - r;
      cursor += row[i].width + H_GAP;
    }
    return sum / idx.length;
  };
  for (let i = 0; i < row.length; i++) {
    let g: Group = { idx: [i], center: desired[i], width: row[i].width };
    while (groups.length) {
      const prev = groups[groups.length - 1];
      const prevRight = prev.center + prev.width / 2;
      const left = g.center - g.width / 2;
      if (left >= prevRight + H_GAP) break;
      groups.pop();
      const idx = [...prev.idx, ...g.idx];
      g = { idx, width: widthOf(idx), center: centerOf(idx) };
    }
    groups.push(g);
  }
  for (const g of groups) {
    let cursor = g.center - g.width / 2;
    for (const i of g.idx) {
      row[i].cx = cursor + row[i].width / 2;
      cursor += row[i].width + H_GAP;
    }
  }
}

function layoutComponent(seed: string, ids: string[], g: Graph, byId: Map<string, LayoutPerson>) {
  const idSet = new Set(ids);
  const gen = assignGenerations(seed, idSet, g);
  const { blocks, blockOf } = buildBlocks(ids, gen, g, byId);

  const layers = new Map<number, Block[]>();
  for (const b of blocks) {
    if (!layers.has(b.gen)) layers.set(b.gen, []);
    layers.get(b.gen)!.push(b);
  }
  const gens = [...layers.keys()].sort((a, b) => a - b);

  const parentBlocks = (b: Block) => {
    const out = new Set<Block>();
    for (const m of b.members) for (const p of g.parents[m] ?? []) {
      const pb = blockOf.get(p);
      if (pb && pb.gen === b.gen - 1) out.add(pb);
    }
    return [...out];
  };
  const childBlocks = (b: Block) => {
    const out = new Set<Block>();
    for (const m of b.members) for (const c of g.children[m] ?? []) {
      const cb = blockOf.get(c);
      if (cb && cb.gen === b.gen + 1) out.add(cb);
    }
    return [...out];
  };

  // --- Ordering: barycenter sweeps keep families contiguous and reduce crossings.
  for (const gn of gens) layers.get(gn)!.forEach((b, i) => (b.order = i));
  const sweep = (down: boolean) => {
    const seq = down ? gens : [...gens].reverse();
    for (const gn of seq) {
      const row = layers.get(gn)!;
      const bary = new Map<Block, number>();
      for (const b of row) {
        const nb = down ? parentBlocks(b) : childBlocks(b);
        bary.set(b, nb.length ? nb.reduce((s, x) => s + x.order, 0) / nb.length : b.order);
      }
      row.sort((a, b) => bary.get(a)! - bary.get(b)! || a.order - b.order);
      row.forEach((b, i) => (b.order = i));
    }
  };
  for (let i = 0; i < 4; i++) {
    sweep(true);
    sweep(false);
  }

  // --- Coordinates: start packed, then relax toward parents / children.
  for (const gn of gens) {
    const row = layers.get(gn)!;
    const total = row.reduce((s, b) => s + b.width, 0) + H_GAP * (row.length - 1);
    let cursor = -total / 2;
    for (const b of row) {
      b.cx = cursor + b.width / 2;
      cursor += b.width + H_GAP;
    }
  }
  const relax = (down: boolean, onlyWithout?: (b: Block) => boolean) => {
    const seq = down ? gens : [...gens].reverse();
    for (const gn of seq) {
      const row = layers.get(gn)!;
      const desired = row.map((b) => {
        if (onlyWithout && !onlyWithout(b)) return b.cx;
        const nb = down ? parentBlocks(b) : childBlocks(b);
        if (!nb.length) return b.cx;
        // The anchor is always the marriage line of the child's own parents,
        // so a child hangs under it and a couple sits over it — never the whole block.
        const xs: number[] = [];
        if (down) {
          for (const m of b.members) {
            const ps = (g.parents[m] ?? []).filter((p) => blockOf.get(p)?.gen === b.gen - 1);
            if (ps.length) xs.push(ps.reduce((s, p) => s + memberCenter(blockOf.get(p)!, p), 0) / ps.length);
          }
        } else {
          for (const cb of nb) {
            for (const m of cb.members) {
              const ps = (g.parents[m] ?? []).filter((p) => blockOf.get(p) === b);
              if (!ps.length) continue;
              const offset = ps.reduce((s, p) => s + memberCenter(b, p) - b.cx, 0) / ps.length;
              xs.push(memberCenter(cb, m) - offset);
            }
          }
        }
        if (!xs.length) return b.cx;
        return xs.reduce((s, x) => s + x, 0) / xs.length;
      });
      resolveOverlaps(row, desired);
    }
  };
  for (let i = 0; i < 5; i++) {
    relax(true);
    relax(false);
  }
  // Final touch: leaves (no children in view) hang under their parents.
  relax(true, (b) => childBlocks(b).length === 0);

  const pos = new Map<string, { x: number; y: number; gen: number }>();
  for (const b of blocks) {
    for (const m of b.members) {
      pos.set(m, { x: memberCenter(b, m) - NODE_W / 2, y: b.gen * V_GAP, gen: b.gen });
    }
  }
  return pos;
}

export function layoutTree(focusId: string, people: LayoutPerson[], rels: Rel[]) {
  const byId = new Map(people.map((p) => [p.id, p]));
  const known = rels.filter((r) => byId.has(r.fromId) && byId.has(r.toId));
  const g = buildGraph(
    people.map((p) => p.id),
    known,
  );

  // Connected components, the focus person's first; each laid out on its own band.
  const remaining = new Set(people.map((p) => p.id));
  const components: string[][] = [];
  const seeds = [focusId, ...people.map((p) => p.id)];
  for (const seed of seeds) {
    if (!remaining.has(seed)) continue;
    const comp: string[] = [];
    const stack = [seed];
    remaining.delete(seed);
    while (stack.length) {
      const cur = stack.pop()!;
      comp.push(cur);
      for (const n of [...(g.parents[cur] ?? []), ...(g.children[cur] ?? []), ...(g.spouses[cur] ?? [])]) {
        if (remaining.has(n)) {
          remaining.delete(n);
          stack.push(n);
        }
      }
    }
    components.push(comp);
  }

  const pos = new Map<string, { x: number; y: number; gen: number }>();
  let bandTop = 0;
  for (const comp of components) {
    const local = layoutComponent(comp[0], comp, g, byId);
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of local.values()) {
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    for (const [id, p] of local) pos.set(id, { ...p, y: p.y - minY + bandTop });
    bandTop += maxY - minY + NODE_H + COMPONENT_GAP;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pos.values()) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + NODE_W);
    maxY = Math.max(maxY, p.y + NODE_H);
  }
  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 400;
    maxY = 300;
  }

  const nodes: LaidNode[] = [];
  for (const p of people) {
    const loc = pos.get(p.id);
    if (!loc) continue;
    nodes.push({ ...p, x: loc.x - minX + PAD, y: loc.y - minY + PAD, gen: loc.gen });
  }
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const edges: LaidEdge[] = [];
  const seenE = new Set<string>();

  // Marriage lines only between neighbours on the same row; one per pair.
  for (const r of known) {
    if (r.type !== "SPOUSE_OF") continue;
    const key = "s" + [r.fromId, r.toId].sort().join();
    if (seenE.has(key)) continue;
    const na = nodeMap.get(r.fromId);
    const nb = nodeMap.get(r.toId);
    if (!na || !nb) continue;
    seenE.add(key);
    edges.push({
      a: r.fromId,
      b: r.toId,
      kind: "spouse",
      x1: na.x + NODE_W / 2,
      y1: na.y + NODE_H / 2,
      x2: nb.x + NODE_W / 2,
      y2: nb.y + NODE_H / 2,
    });
  }

  // One drop per child, from the midpoint of its parents (the marriage line) or a lone parent.
  for (const child of nodes) {
    const ps = (g.parents[child.id] ?? []).map((p) => nodeMap.get(p)).filter((n): n is LaidNode => Boolean(n));
    if (!ps.length) continue;
    const above = ps.filter((p) => p.y < child.y);
    const src = above.length ? above : ps;
    const sx = src.reduce((s, p) => s + p.x + NODE_W / 2, 0) / src.length;
    const sy = src.length > 1 && src.every((p) => p.y === src[0].y) ? src[0].y + NODE_H / 2 : src[0].y + NODE_H;
    edges.push({
      a: src[0].id,
      b: child.id,
      kind: "parent",
      x1: sx,
      y1: sy,
      x2: child.x + NODE_W / 2,
      y2: child.y,
    });
  }

  return {
    nodes,
    edges,
    width: maxX - minX + PAD * 2,
    height: maxY - minY + PAD * 2,
    nodeW: NODE_W,
    nodeH: NODE_H,
  };
}
