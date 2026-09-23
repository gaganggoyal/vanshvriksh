import { PrismaClient } from "@prisma/client";
import { layoutTree } from "../src/lib/tree-layout";
import { displayName, initials } from "../src/lib/names";

const prisma = new PrismaClient();

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error("FAIL", msg);
    process.exitCode = 1;
  } else {
    console.log("ok ", msg);
  }
}

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "priya@demo.meravansh.lol" },
    include: { tree: true },
  });
  if (!user?.tree) throw new Error("Seed Priya first");
  const people = await prisma.person.findMany({ where: { treeId: user.tree.id } });
  const rels = await prisma.relationship.findMany({ where: { treeId: user.tree.id } });
  const root = people.find((p) => p.isRoot);
  if (!root) throw new Error("no root");

  const laid = layoutTree(
    root.id,
    people.map((p) => ({
      id: p.id,
      givenName: p.givenName,
      familyName: p.familyName,
      nativeName: p.nativeName,
      gender: p.gender,
      isLiving: p.isLiving,
      isRoot: p.isRoot,
      displayName: displayName(p),
      initials: initials(p),
    })),
    rels,
  );

  assert(laid.nodes.length === people.length, `all ${people.length} people placed (${laid.nodes.length})`);
  assert(
    laid.nodes.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y)),
    "no NaN coordinates",
  );
  const byName = Object.fromEntries(laid.nodes.map((n) => [n.displayName, n]));
  const priya = byName["Priya Sharma"];
  const rajesh = byName["Rajesh Sharma"];
  const sunita = byName["Sunita Sharma"];
  const harishankar = byName["Harishankar Sharma"];
  const kamla = byName["Kamla Devi"];
  const ananya = byName["Ananya Sharma"];
  assert(priya && rajesh && sunita && harishankar && kamla && ananya, "named nodes present");
  assert(rajesh.y < priya.y, "father sits above Priya");
  assert(sunita.y < priya.y, "mother sits above Priya");
  assert(harishankar.y < rajesh.y, "grandfather sits above father");
  assert(kamla.y < rajesh.y, "grandmother sits above father");
  assert(Math.abs(ananya.y - priya.y) < 5, "sibling shares Priya's generation");
  assert(laid.edges.some((e) => e.kind === "spouse"), "spouse edges exist");
  assert(laid.edges.some((e) => e.kind === "parent"), "parent edges exist");
  assert(laid.width > 200 && laid.height > 200, `canvas size ${laid.width}x${laid.height}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
