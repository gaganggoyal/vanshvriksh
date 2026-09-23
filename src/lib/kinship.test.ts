import { kinship, kinshipMap, type KinPerson } from "./kinship";
import type { Rel } from "./graph";

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error("FAIL", msg);
    process.exitCode = 1;
  } else {
    console.log("ok ", msg);
  }
}

const P = (id: string, gender: "MALE" | "FEMALE" | "UNKNOWN", birthYear?: number): KinPerson => ({
  id,
  gender,
  birthYear: birthYear ?? null,
});

const people: KinPerson[] = [
  P("me", "FEMALE", 1995),
  P("dad", "MALE", 1968),
  P("mom", "FEMALE", 1971),
  P("bro", "MALE", 1992),
  P("lilsis", "FEMALE", 1998),
  P("bhabhi", "FEMALE", 1993),
  P("bhatija", "MALE", 2018),
  P("dada", "MALE", 1940),
  P("dadi", "FEMALE", 1943),
  P("tau", "MALE", 1965),
  P("tai", "FEMALE", 1967),
  P("chacha", "MALE", 1972),
  P("chachi", "FEMALE", 1975),
  P("chacheraBhai", "MALE", 1999),
  P("bua", "FEMALE", 1970),
  P("fufa", "MALE", 1966),
  P("fufheriBahen", "FEMALE", 1996),
  P("nana", "MALE", 1945),
  P("nani", "FEMALE", 1948),
  P("mama", "MALE", 1974),
  P("mami", "FEMALE", 1976),
  P("mausi", "FEMALE", 1969),
  P("mausa", "MALE", 1965),
  P("mauseraBhai", "MALE", 1990),
  P("pardada", "MALE", 1915),
  P("husband", "MALE", 1993),
  P("sasur", "MALE", 1960),
  P("saas", "FEMALE", 1963),
  P("jeth", "MALE", 1990),
  P("jethani", "FEMALE", 1991),
  P("devar", "MALE", 1997),
  P("nanad", "FEMALE", 1995),
  P("son", "MALE", 2019),
  P("daughter", "FEMALE", 2021),
  P("bahu", "FEMALE", 2020),
  P("pota", "MALE", 2045),
  P("natin", "FEMALE", 2047),
  P("stranger", "MALE"),
];

const rel = (type: "PARENT_OF" | "SPOUSE_OF", fromId: string, toId: string): Rel => ({ type, fromId, toId });
const parents = (kid: string, ...ps: string[]) => ps.map((p) => rel("PARENT_OF", p, kid));

const rels: Rel[] = [
  ...parents("me", "dad", "mom"),
  ...parents("bro", "dad", "mom"),
  ...parents("lilsis", "dad", "mom"),
  rel("SPOUSE_OF", "dad", "mom"),
  rel("SPOUSE_OF", "bro", "bhabhi"),
  ...parents("bhatija", "bro", "bhabhi"),
  ...parents("dad", "dada", "dadi"),
  ...parents("tau", "dada", "dadi"),
  ...parents("chacha", "dada", "dadi"),
  ...parents("bua", "dada", "dadi"),
  rel("SPOUSE_OF", "dada", "dadi"),
  rel("SPOUSE_OF", "tau", "tai"),
  rel("SPOUSE_OF", "chacha", "chachi"),
  rel("SPOUSE_OF", "bua", "fufa"),
  ...parents("chacheraBhai", "chacha", "chachi"),
  ...parents("fufheriBahen", "bua", "fufa"),
  ...parents("mom", "nana", "nani"),
  ...parents("mama", "nana", "nani"),
  ...parents("mausi", "nana", "nani"),
  rel("SPOUSE_OF", "nana", "nani"),
  rel("SPOUSE_OF", "mama", "mami"),
  rel("SPOUSE_OF", "mausi", "mausa"),
  ...parents("mauseraBhai", "mausi", "mausa"),
  ...parents("dada", "pardada"),
  rel("SPOUSE_OF", "me", "husband"),
  ...parents("husband", "sasur", "saas"),
  ...parents("jeth", "sasur", "saas"),
  ...parents("devar", "sasur", "saas"),
  ...parents("nanad", "sasur", "saas"),
  rel("SPOUSE_OF", "jeth", "jethani"),
  ...parents("son", "me", "husband"),
  ...parents("daughter", "me", "husband"),
  rel("SPOUSE_OF", "son", "bahu"),
  ...parents("pota", "son", "bahu"),
  ...parents("natin", "daughter"),
];

const k = (id: string) => kinship("me", id, people, rels);

assert(k("me")?.hi === "आप", "self is आप");
assert(k("dad")?.hi === "पिता" && k("dad")?.en === "father", "father → पिता");
assert(k("mom")?.hi === "माता", "mother → माता");
assert(k("bro")?.hi === "बड़े भाई" && k("bro")?.en === "elder brother", "elder brother → बड़े भाई");
assert(k("lilsis")?.hi === "छोटी बहन", "younger sister → छोटी बहन");
assert(k("bhabhi")?.hi.startsWith("भाभी"), "brother's wife → भाभी");
assert(k("bhatija")?.hi === "भतीजा", "brother's son → भतीजा");
assert(k("dada")?.hi === "दादा" && k("dadi")?.hi === "दादी", "paternal grandparents → दादा / दादी");
assert(k("nana")?.hi === "नाना" && k("nani")?.hi === "नानी", "maternal grandparents → नाना / नानी");
assert(k("pardada")?.hi === "परदादा", "great-grandfather → परदादा");
assert(k("tau")?.hi === "ताऊ" && k("tau")?.en === "father's elder brother", "father's elder brother → ताऊ");
assert(k("tai")?.hi === "ताई", "ताऊ's wife → ताई");
assert(k("chacha")?.hi === "चाचा", "father's younger brother → चाचा");
assert(k("chachi")?.hi === "चाची", "चाचा's wife → चाची");
assert(k("bua")?.hi === "बुआ" && k("fufa")?.hi === "फूफा", "father's sister → बुआ, her husband → फूफा");
assert(k("mama")?.hi === "मामा" && k("mami")?.hi === "मामी", "mother's brother → मामा, wife → मामी");
assert(k("mausi")?.hi === "मौसी" && k("mausa")?.hi === "मौसा", "mother's sister → मौसी, husband → मौसा");
assert(k("chacheraBhai")?.hi === "चचेरा भाई", "father's brother's son → चचेरा भाई");
assert(k("fufheriBahen")?.hi === "फुफेरी बहन", "father's sister's daughter → फुफेरी बहन");
assert(k("mauseraBhai")?.hi === "मौसेरे बड़े भाई", "mother's sister's elder son → मौसेरे बड़े भाई");
assert(k("husband")?.hi === "पति", "husband → पति");
assert(k("sasur")?.hi === "ससुर" && k("saas")?.hi === "सास", "in-laws → ससुर / सास");
assert(k("jeth")?.hi === "जेठ" && k("jethani")?.hi === "जेठानी", "husband's elder brother → जेठ, wife → जेठानी");
assert(k("devar")?.hi === "देवर", "husband's younger brother → देवर");
assert(k("nanad")?.hi === "ननद", "husband's sister → ननद");
assert(k("son")?.hi === "बेटा" && k("daughter")?.hi === "बेटी", "children → बेटा / बेटी");
assert(k("bahu")?.hi === "बहू", "son's wife → बहू");
assert(k("pota")?.hi === "पोता", "son's son → पोता");
assert(k("natin")?.hi === "नातिन", "daughter's daughter → नातिन");
assert(k("stranger") === null, "unconnected person has no term");
assert(k("husband")?.blood === false && k("dad")?.blood === true, "blood vs marriage flag");

// Unknown birth order stays honest.
const noYears = people.map((p) => ({ ...p, birthYear: null }));
assert(kinship("me", "chacha", noYears, rels)?.hi === "चाचा / ताऊ", "unknown birth order → चाचा / ताऊ");
assert(kinship("me", "bro", noYears, rels)?.hi === "भाई", "unknown birth order → भाई");

// From the other side.
assert(kinship("dad", "me", people, rels)?.hi === "बेटी", "reverse: daughter → बेटी");
assert(kinship("dada", "me", people, rels)?.hi === "पोती", "grandfather sees पोती");
assert(kinship("nana", "me", people, rels)?.hi === "नातिन", "maternal grandfather sees नातिन");
assert(kinship("husband", "dad", people, rels)?.hi === "ससुर", "husband sees ससुर");
assert(kinship("husband", "bro", people, rels)?.hi === "साला", "husband sees wife's brother as साला");

const all = kinshipMap("me", people, rels);
assert(all.size === people.length - 1, `kinshipMap covers all connected people (${all.size})`);

if (process.exitCode) {
  console.error("kinship tests failed");
  process.exit(1);
}
console.log("all kinship tests passed");
