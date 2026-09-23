import { gedcomDate, toGedcom, type GedcomPerson } from "./gedcom";
import type { Rel } from "./graph";

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error("FAIL", msg);
    process.exitCode = 1;
  } else {
    console.log("ok ", msg);
  }
}

const P = (id: string, givenName: string, familyName: string, gender: string, extra: Partial<GedcomPerson> = {}): GedcomPerson => ({
  id,
  givenName,
  familyName,
  nativeName: "",
  alsoKnownAs: "",
  gender,
  birthDate: null,
  birthPlace: "",
  deathDate: null,
  isLiving: true,
  village: "",
  gotra: "",
  notes: "",
  ...extra,
});

const people = [
  P("priya", "Priya", "Sharma", "FEMALE", { nativeName: "प्रिया शर्मा", birthDate: "1995-03-12", village: "Jaipur", gotra: "Bharadwaj" }),
  P("rajesh", "Rajesh", "Sharma", "MALE", { birthDate: "1968-07-22" }),
  P("sunita", "Sunita", "Sharma", "FEMALE", { birthDate: "1971-11-03" }),
  P("hari", "Harishankar", "Sharma", "MALE", { alsoKnownAs: "Hari Shankar", isLiving: false, deathDate: "2018-06-04", notes: "Line one\nLine two" }),
  P("kamla", "Kamla", "Devi", "FEMALE", { isLiving: false }),
];
const rels: Rel[] = [
  { type: "PARENT_OF", fromId: "rajesh", toId: "priya" },
  { type: "PARENT_OF", fromId: "sunita", toId: "priya" },
  { type: "SPOUSE_OF", fromId: "rajesh", toId: "sunita" },
  { type: "PARENT_OF", fromId: "hari", toId: "rajesh" },
  { type: "PARENT_OF", fromId: "kamla", toId: "rajesh" },
  { type: "SPOUSE_OF", fromId: "hari", toId: "kamla" },
];

assert(gedcomDate("1995-03-12") === "12 MAR 1995", "ISO date → GEDCOM date");
assert(gedcomDate(null) === null, "missing date stays empty");

const ged = toGedcom(people, rels, { title: "शर्मा वंश वृक्ष", now: new Date("2026-09-13T00:00:00Z") });
const lines = ged.split("\r\n");

assert(lines[0] === "0 HEAD" && lines.at(-2) === "0 TRLR", "HEAD … TRLR envelope");
assert(lines.includes("2 VERS 5.5.1") && lines.includes("1 CHAR UTF-8"), "declares 5.5.1 UTF-8");
assert(lines.includes("1 NAME Priya /Sharma/") && lines.includes("2 SURN Sharma"), "name with surname slashes");
assert(lines.includes("1 NAME प्रिया शर्मा") && lines.includes("2 TYPE native"), "native-script name kept");
assert(lines.includes("1 NAME Hari Shankar") && lines.includes("2 TYPE aka"), "aka name kept");
assert(lines.includes("2 DATE 12 MAR 1995"), "birth date exported for the owner");
assert(lines.includes("1 DEAT Y") && lines.includes("2 DATE 4 JUN 2018"), "death recorded");
assert(lines.includes("1 FACT Bharadwaj") && lines.includes("2 TYPE Gotra"), "gotra as a typed fact");
assert(lines.includes("1 NOTE Line one") && lines.includes("2 CONT Line two"), "multi-line notes use CONT");

const famCount = lines.filter((l) => /^0 @F\d+@ FAM$/.test(l)).length;
assert(famCount === 2, `two families (Rajesh+Sunita, Hari+Kamla) → ${famCount}`);
const priyaIdx = lines.indexOf("0 @I1@ INDI");
const rajeshIdx = lines.indexOf("0 @I2@ INDI");
const priyaBlock = lines.slice(priyaIdx, rajeshIdx);
assert(priyaBlock.some((l) => l.startsWith("1 FAMC ")), "child points to her parents' family");
const rajeshBlock = lines.slice(rajeshIdx, lines.indexOf("0 @I3@ INDI"));
assert(rajeshBlock.some((l) => l.startsWith("1 FAMS ")) && rajeshBlock.some((l) => l.startsWith("1 FAMC ")), "father has FAMS and FAMC");

const famRajesh = lines.slice(lines.indexOf("0 @F1@ FAM"), lines.indexOf("0 @F2@ FAM"));
assert(famRajesh.includes("1 HUSB @I2@") && famRajesh.includes("1 WIFE @I3@") && famRajesh.includes("1 CHIL @I1@"), "family lists husband, wife, child");

// Lone parent still produces a family.
const single = toGedcom([P("a", "A", "", "FEMALE"), P("b", "B", "", "MALE")], [{ type: "PARENT_OF", fromId: "a", toId: "b" }]);
assert(single.includes("1 WIFE @I1@") && single.includes("1 CHIL @I2@") && !single.includes("1 HUSB"), "single mother family");

if (process.exitCode) {
  console.error("gedcom tests failed");
  process.exit(1);
}
console.log("all gedcom tests passed");
