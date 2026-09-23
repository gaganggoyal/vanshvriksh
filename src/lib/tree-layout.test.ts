import { layoutTree, type LayoutPerson } from "./tree-layout";
import type { Rel } from "./graph";

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error("FAIL", msg);
    process.exitCode = 1;
  } else {
    console.log("ok ", msg);
  }
}

const P = (id: string, gender = "UNKNOWN", isRoot = false): LayoutPerson => ({
  id,
  givenName: id,
  familyName: "",
  nativeName: "",
  gender,
  isLiving: true,
  isRoot,
  displayName: id,
  initials: id[0].toUpperCase(),
});
const parent = (p: string, c: string): Rel => ({ type: "PARENT_OF", fromId: p, toId: c });
const spouse = (a: string, b: string): Rel => ({ type: "SPOUSE_OF", fromId: a, toId: b });

// A realistic joint family: both grandparent lines, an uncle with a cousin,
// a married sister with a child, two marriages, an unconnected stray.
const people = [
  P("me", "FEMALE", true), P("dad", "MALE"), P("mom", "FEMALE"),
  P("gpa", "MALE"), P("gma", "FEMALE"),
  P("uncle", "MALE"), P("aunt", "FEMALE"), P("cousin", "MALE"),
  P("sis", "FEMALE"), P("sisHusband", "MALE"), P("niece", "FEMALE"),
  P("husband", "MALE"), P("husband2", "MALE"), P("kid", "MALE"),
  P("mgpa", "MALE"), P("mgma", "FEMALE"), P("mama", "MALE"),
  P("stray", "UNKNOWN"),
];
const rels: Rel[] = [
  parent("dad", "me"), parent("mom", "me"), spouse("dad", "mom"),
  parent("gpa", "dad"), parent("gma", "dad"), spouse("gpa", "gma"),
  parent("gpa", "uncle"), parent("gma", "uncle"), spouse("uncle", "aunt"),
  parent("uncle", "cousin"), parent("aunt", "cousin"),
  parent("dad", "sis"), parent("mom", "sis"), spouse("sis", "sisHusband"),
  parent("sis", "niece"), parent("sisHusband", "niece"),
  spouse("me", "husband"), spouse("me", "husband2"),
  parent("me", "kid"), parent("husband", "kid"),
  parent("mgpa", "mom"), parent("mgma", "mom"), spouse("mgpa", "mgma"),
  parent("mgpa", "mama"), parent("mgma", "mama"),
];

const laid = layoutTree("me", people, rels);
const at = Object.fromEntries(laid.nodes.map((n) => [n.id, n]));
const cx = (id: string) => at[id].x + laid.nodeW / 2;

assert(laid.nodes.length === people.length, `every person is placed (${laid.nodes.length}/${people.length})`);
assert(laid.nodes.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y)), "no NaN coordinates");

const overlaps: string[] = [];
for (let i = 0; i < laid.nodes.length; i++) {
  for (let j = i + 1; j < laid.nodes.length; j++) {
    const a = laid.nodes[i];
    const b = laid.nodes[j];
    if (Math.abs(a.x - b.x) < laid.nodeW && Math.abs(a.y - b.y) < laid.nodeH) overlaps.push(`${a.id}/${b.id}`);
  }
}
assert(overlaps.length === 0, `no overlapping cards (${overlaps.join(", ") || "none"})`);

assert(at.me.gen === 0 && at.dad.gen === -1 && at.gpa.gen === -2 && at.kid.gen === 1, "generations assigned");
assert(at.dad.y < at.me.y && at.gpa.y < at.dad.y && at.mgpa.y < at.mom.y, "ancestors rise by generation");
assert(at.uncle.y === at.dad.y && at.mama.y === at.mom.y, "uncles share the parents' row");
assert(at.cousin.y === at.me.y && at.sis.y === at.me.y, "cousins and siblings share my row");
assert(at.niece.y === at.kid.y, "niece shares my child's row");
assert(at.husband.y === at.me.y && at.husband2.y === at.me.y, "both spouses on my row");
assert(Math.abs(cx("dad") - cx("mom")) === laid.nodeW + 22, "parents drawn as a couple");
assert(cx("dad") < cx("mom") && cx("gpa") < cx("gma"), "husband sits left of wife");
assert(
  Math.abs(cx("husband") - cx("me")) === laid.nodeW + 22 && Math.abs(cx("husband2") - cx("me")) === laid.nodeW + 22,
  "two marriages flank the person",
);
assert(Math.abs(cx("kid") - (cx("me") + cx("husband")) / 2) < 1, "child hangs from its own parents' marriage line");
assert(Math.abs(cx("cousin") - (cx("uncle") + cx("aunt")) / 2) < 1, "cousin hangs under uncle and aunt");
assert(at.stray.y > Math.max(...laid.nodes.filter((n) => n.id !== "stray").map((n) => n.y)), "unconnected person sits on its own band below");

const drops = laid.edges.filter((e) => e.kind === "parent");
assert(drops.length === laid.nodes.filter((n) => rels.some((r) => r.type === "PARENT_OF" && r.toId === n.id)).length, "one drop line per child");
const meDrop = drops.find((e) => e.b === "me")!;
assert(Math.abs(meDrop.x1 - (cx("dad") + cx("mom")) / 2) < 1, "drop starts at the parents' marriage midpoint");
assert(laid.edges.filter((e) => e.kind === "spouse").length === 7, "one marriage line per couple");

// Empty and single-person trees never crash.
const solo = layoutTree("x", [P("x", "MALE", true)], []);
assert(solo.nodes.length === 1 && solo.width > 0, "single person lays out");
const none = layoutTree("x", [], []);
assert(none.nodes.length === 0 && Number.isFinite(none.width), "empty tree lays out");

if (process.exitCode) {
  console.error("layout tests failed");
  process.exit(1);
}
console.log("all layout tests passed");
