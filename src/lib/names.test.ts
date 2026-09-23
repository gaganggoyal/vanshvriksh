import { bestNameScore, buildSearchKey, phoneticKey, queryKeys, samePhonetic, transliterate } from "./names";
import { nameKeys, scorePair } from "./matching";

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error("FAIL", msg);
    process.exitCode = 1;
  } else {
    console.log("ok ", msg);
  }
}

// Transliteration with Hindi schwa deletion
assert(transliterate("राम") === "raam", "राम → raam (final schwa dropped)");
assert(transliterate("कमला") === "kamlaa", "कमला → kamlaa (medial schwa dropped)");
assert(transliterate("हरिशंकर") === "harishankar", "हरिशंकर → harishankar");
assert(transliterate("लक्ष्मी") === "lakshmee", "conjunct क्ष via virama");
assert(transliterate("ज़ुबैर") === "zubair", "nukta ज़ → z");
assert(transliterate("Priya Sharma") === "priya sharma", "Latin passes through");

// Phonetic keys: spelling and script collapse
const same: [string, string][] = [
  ["Kamla", "Kamala"],
  ["Kamala", "कमला"],
  ["Lakshmi", "Laxmi"],
  ["Seeta", "Sita"],
  ["Pooja", "Puja"],
  ["Choudhary", "Chaudhari"],
  ["Sharma", "शर्मा"],
  ["Harishankar", "Hari Shankar"],
  ["Harishankar", "हरिशंकर"],
  ["Savitri", "सावित्री"],
];
for (const [a, b] of same) assert(samePhonetic(a, b), `${a} ≈ ${b}`);
assert(!samePhonetic("Ram", "Shyam"), "Ram ≠ Shyam");
assert(!samePhonetic("Sunita", "Sunil"), "Sunita ≠ Sunil");
assert(phoneticKey("") === "", "empty key");

// Search bag
const key = buildSearchKey({ givenName: "Hari Shankar", familyName: "Sharma", nativeName: "हरि शंकर शर्मा", village: "Jaipur", gotra: "Bharadwaj" });
for (const q of ["harishankar", "हरिशंकर", "Hari", "sharma", "jaipur", "bharadwaj"]) {
  assert(queryKeys(q).every((k) => key.includes(` ${k}`)), `search "${q}" finds Hari Shankar`);
}
assert(!queryKeys("Tiwari").every((k) => key.includes(` ${k}`)), `search "Tiwari" does not`);
assert(key.startsWith(" ") && key.endsWith(" "), "bag is space-padded for token-prefix search");

// Cross-script matching
const devanagariOnly = bestNameScore({ givenName: "हरिशंकर", familyName: "शर्मा" }, { givenName: "Harishankar", familyName: "Sharma" });
assert(devanagariOnly.given >= 0.95 && devanagariOnly.family >= 0.95, `Devanagari vs Latin names score high (${devanagariOnly.given.toFixed(2)}, ${devanagariOnly.family.toFixed(2)})`);
const viaNative = bestNameScore(
  { givenName: "Kamla", familyName: "Devi", nativeName: "कमला देवी" },
  { givenName: "कमला", familyName: "देवी" },
);
assert(viaNative.given >= 0.95, "native name with surname stripped still matches");
const empty = { parentNames: [] as string[], spouseNames: [] as string[], childNames: [] as string[] };
const scored = scorePair(
  { givenName: "हरिशंकर", familyName: "शर्मा", gender: "MALE", birthDate: "1940-01-18", village: "जयपुर" },
  { givenName: "Harishankar", familyName: "Sharma", gender: "MALE", birthDate: "1940-01-18", village: "Jaipur" },
  empty,
  empty,
);
assert(scored.score >= 58, `a family writing only in Devanagari is matched (${scored.score})`);
const kinKeys = [...nameKeys("कमला देवी")].some((k) => nameKeys("Kamala Devi").has(k));
assert(kinKeys, "relative names overlap across scripts (कमला देवी ~ Kamala Devi)");

if (process.exitCode) {
  console.error("names tests failed");
  process.exit(1);
}
console.log("all names tests passed");
