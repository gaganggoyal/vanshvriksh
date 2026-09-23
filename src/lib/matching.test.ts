import { scorePair, publicReasons, sharedNames } from "./matching";

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error("FAIL", msg);
    process.exitCode = 1;
  } else {
    console.log("ok ", msg);
  }
}

const empty = { parentNames: [] as string[], spouseNames: [] as string[], childNames: [] as string[] };

const a = {
  givenName: "Harishankar",
  familyName: "Sharma",
  gender: "MALE",
  birthDate: "1940-01-18",
  village: "Jaipur",
  gotra: "Bharadwaj",
};
const b = {
  givenName: "Hari Shankar",
  familyName: "Sharma",
  gender: "MALE",
  birthDate: "1940-01-18",
  village: "Jaipur",
  gotra: "Bharadwaj",
};

const high = scorePair(
  a,
  b,
  { ...empty, spouseNames: ["Kamla Devi"] },
  { ...empty, spouseNames: ["Kamla Devi"] },
);
assert(high.score >= 80, `same grandfather scores high (${high.score})`);
assert(
  publicReasons(high.reasons).every((r) => !r.label.toLowerCase().includes("birth")),
  "public reasons never mention birth",
);

const conflict = scorePair(
  { ...a, birthDate: "1940-01-18" },
  { ...b, givenName: "Ramesh", birthDate: "1965-04-02" },
  empty,
  empty,
);
assert(conflict.score === 0, "distant dates with different names reject");

const weak = scorePair(
  { givenName: "Ram", familyName: "Singh", gender: "MALE" },
  { givenName: "Shyam", familyName: "Patel", gender: "MALE" },
  empty,
  empty,
);
assert(weak.score === 0, "unrelated common-ish names without dates or kin reject");

const shared = sharedNames(["Kamla Devi", "Rajesh Sharma"], ["Kamala Devi", "Vikram Sharma"]);
assert(shared.includes("Kamla Devi"), "Kamla Devi overlaps Kamala Devi");
const compound = sharedNames(["Harishankar Sharma"], ["Hari Shankar Sharma"]);
assert(compound.includes("Harishankar Sharma"), "Harishankar overlaps Hari Shankar");

if (process.exitCode) {
  console.error("matching tests failed");
  process.exit(1);
}
console.log("all matching tests passed");
