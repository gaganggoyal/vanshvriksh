/**
 * Recompute derived name keys (blocking keys for matching, phonetic search bag)
 * for every person. Safe to run any number of times; run after upgrading.
 */
import { PrismaClient } from "@prisma/client";
import { searchFields } from "../src/lib/people";

const prisma = new PrismaClient();

async function main() {
  const people = await prisma.person.findMany();
  let changed = 0;
  for (const p of people) {
    const next = searchFields(p);
    if (
      next.searchKey !== p.searchKey ||
      next.normalizedGiven !== p.normalizedGiven ||
      next.normalizedFamily !== p.normalizedFamily
    ) {
      await prisma.person.update({ where: { id: p.id }, data: next });
      changed++;
    }
  }
  console.log(`Backfilled ${changed} of ${people.length} people.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
