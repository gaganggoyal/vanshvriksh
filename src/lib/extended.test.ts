import { mergeFamilies } from "./extended";
import { kinshipMap } from "./kinship";
import type { Rel } from "./graph";

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error("FAIL", msg);
    process.exitCode = 1;
  } else {
    console.log("ok ", msg);
  }
}

// Priya's tree (A) and her मामा Mahesh's tree (B) both hold Priya's mother Sunita.
const P = (id: string, treeId: string, gender: string) => ({ id, treeId, gender, birthYear: null as number | null });
const people = [
  P("priya", "A", "FEMALE"), P("rajesh", "A", "MALE"), P("sunitaA", "A", "FEMALE"),
  P("mahesh", "B", "MALE"), P("ramprasad", "B", "MALE"), P("savitri", "B", "FEMALE"),
  P("sunitaB", "B", "FEMALE"), P("kartik", "B", "MALE"), P("rekha", "B", "FEMALE"),
];
const rels: Rel[] = [
  { type: "PARENT_OF", fromId: "rajesh", toId: "priya" },
  { type: "PARENT_OF", fromId: "sunitaA", toId: "priya" },
  { type: "SPOUSE_OF", fromId: "rajesh", toId: "sunitaA" },
  { type: "PARENT_OF", fromId: "ramprasad", toId: "mahesh" },
  { type: "PARENT_OF", fromId: "savitri", toId: "mahesh" },
  { type: "PARENT_OF", fromId: "ramprasad", toId: "sunitaB" },
  { type: "PARENT_OF", fromId: "savitri", toId: "sunitaB" },
  { type: "SPOUSE_OF", fromId: "ramprasad", toId: "savitri" },
  { type: "SPOUSE_OF", fromId: "mahesh", toId: "rekha" },
  { type: "PARENT_OF", fromId: "mahesh", toId: "kartik" },
  { type: "PARENT_OF", fromId: "rekha", toId: "kartik" },
];

const merged = mergeFamilies({ myTreeId: "A", people, rels, links: [["sunitaB", "sunitaA"]] });
const ids = new Set(merged.people.map((p) => p.id));
assert(merged.people.length === people.length - 1, `two Sunitas become one (${merged.people.length})`);
assert(ids.has("sunitaA") && !ids.has("sunitaB"), "your own record survives the merge");
assert(merged.aliases.get("sunitaB") === "sunitaA", "their record aliases to yours");
assert(merged.rels.some((r) => r.type === "PARENT_OF" && r.fromId === "ramprasad" && r.toId === "sunitaA"), "their edges re-point at your record");

const kin = kinshipMap("priya", merged.people, merged.rels);
assert(kin.get("ramprasad")?.hi === "नाना", "mother's father across families → नाना");
assert(kin.get("savitri")?.hi === "नानी", "mother's mother across families → नानी");
assert(kin.get("mahesh")?.hi === "मामा", "mother's brother across families → मामा");
assert(kin.get("rekha")?.hi === "मामी", "his wife → मामी");
assert(kin.get("kartik")?.hi.startsWith("ममेर"), `his son → ममेरा भाई (${kin.get("kartik")?.hi})`);

// No links: nothing merges, nothing crosses.
const apart = mergeFamilies({ myTreeId: "A", people, rels, links: [] });
assert(apart.people.length === people.length, "unlinked trees stay apart");
assert(!kinshipMap("priya", apart.people, apart.rels).has("mahesh"), "no kinship without a link");

// Duplicate and contradictory edges collapse.
const dup = mergeFamilies({
  myTreeId: "A",
  people: [P("x", "A", "MALE"), P("y", "A", "MALE"), P("x2", "B", "MALE"), P("y2", "B", "MALE")],
  rels: [
    { type: "PARENT_OF", fromId: "x", toId: "y" },
    { type: "PARENT_OF", fromId: "x2", toId: "y2" },
    { type: "PARENT_OF", fromId: "y2", toId: "x2" },
  ],
  links: [["x", "x2"], ["y", "y2"]],
});
assert(dup.rels.length === 1, `duplicate and reversed parent edges collapse (${dup.rels.length})`);

if (process.exitCode) {
  console.error("extended tests failed");
  process.exit(1);
}
console.log("all extended tests passed");
