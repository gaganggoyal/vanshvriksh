const HONORIFICS =
  /\b(shri|smt|sri|shree|mr|mrs|ms|miss|dr|prof|kumar|kumari|bhai|ben|ji|sahib|begum|pandit|pt)\b/g;

const VARIANTS: Record<string, string> = {
  krishna: "krishn",
  krishan: "krishn",
  kishan: "krishn",
  ram: "ram",
  rama: "ram",
  ramchandra: "ram",
  mohammed: "mohd",
  muhammad: "mohd",
  mohammad: "mohd",
  mohd: "mohd",
  md: "mohd",
  sita: "sita",
  seeta: "sita",
  geeta: "gita",
  gita: "gita",
  pooja: "puja",
  puja: "puja",
  poojaa: "puja",
  lakshmi: "laxmi",
  laxmi: "laxmi",
  laxman: "lakshman",
  lakshman: "lakshman",
  yash: "yash",
  yas: "yash",
  aishwarya: "aishwarya",
  ashok: "ashok",
  asok: "ashok",
  vikram: "vikram",
  bikram: "vikram",
  rajesh: "rajesh",
  rajes: "rajesh",
  harishankar: "harishankar",
  hari: "hari",
  sunita: "sunita",
  suneeta: "sunita",
  kamla: "kamla",
  kamala: "kamla",
  kamlesh: "kamlesh",
  priya: "priya",
  priyanka: "priyanka",
  arjun: "arjun",
  arjuna: "arjun",
};

export function stripHonorifics(value: string) {
  return value.toLowerCase().replace(HONORIFICS, " ").replace(/\s+/g, " ").trim();
}

export function normalizeName(value: string) {
  return stripHonorifics(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\u0900-\u097f\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function canonicalizeToken(token: string) {
  const n = normalizeName(token);
  return VARIANTS[n] ?? n;
}

export function nameTokens(value: string) {
  return normalizeName(value)
    .split(" ")
    .filter(Boolean)
    .map(canonicalizeToken);
}

export function displayName(person: {
  givenName: string;
  familyName?: string | null;
  nativeName?: string | null;
}) {
  const latin = [person.givenName, person.familyName].filter(Boolean).join(" ").trim();
  return latin || person.nativeName || "Unknown";
}

export function initials(person: { givenName: string; familyName?: string | null }) {
  const a = person.givenName?.trim()?.[0] ?? "";
  const b = person.familyName?.trim()?.[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

/** Jaro-Winkler similarity, 0..1 */
export function jaroWinkler(a: string, b: string) {
  const s1 = normalizeName(a);
  const s2 = normalizeName(b);
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;

  const maxDist = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  const s1Match = new Array(s1.length).fill(false);
  const s2Match = new Array(s2.length).fill(false);
  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - maxDist);
    const end = Math.min(i + maxDist + 1, s2.length);
    for (let j = start; j < end; j++) {
      if (s2Match[j] || s1[i] !== s2[j]) continue;
      s1Match[i] = true;
      s2Match[j] = true;
      matches++;
      break;
    }
  }
  if (!matches) return 0;

  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Match[i]) continue;
    while (!s2Match[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const m = matches;
  const jaro =
    (m / s1.length + m / s2.length + (m - transpositions / 2) / m) / 3;

  let prefix = 0;
  for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

type Named = { givenName: string; familyName?: string | null; alsoKnownAs?: string | null; nativeName?: string | null };

/** Given-name spellings for a person: the given name, each alias, and the native-script name without its surname. */
function givenVariants(p: Named) {
  const out = [p.givenName, ...(p.alsoKnownAs ?? "").split(",")];
  if (p.nativeName) {
    const toks = transliterate(p.nativeName).split(" ").filter(Boolean);
    const famKey = phoneticKey(p.familyName ?? "");
    if (toks.length > 1 && famKey && phoneticKey(toks[toks.length - 1]) === famKey) toks.pop();
    out.push(toks.join(" "));
  }
  return out.map((v) => v.trim()).filter(Boolean);
}

export function bestNameScore(a: Named, b: Named) {
  let given = 0;
  for (const x of givenVariants(a)) {
    for (const y of givenVariants(b)) {
      given = Math.max(given, jaroWinkler(transliterate(x), transliterate(y)));
      const xt = nameTokens(transliterate(x));
      const yt = nameTokens(transliterate(y));
      if (xt[0] && yt[0] && xt[0] === yt[0]) given = Math.max(given, 0.96);
      if (samePhonetic(x, y)) given = Math.max(given, 0.95);
    }
  }

  let family = jaroWinkler(transliterate(a.familyName ?? ""), transliterate(b.familyName ?? ""));
  if (a.familyName && b.familyName && samePhonetic(a.familyName, b.familyName)) family = Math.max(family, 0.95);
  return { given, family };
}

// ---------------------------------------------------------------------------
// Devanagari → Latin, and phonetic keys
//
// Families write the same person as "हरिशंकर", "Harishankar", "Hari Shankar",
// "Harishanker". Transliterating the native script and reducing every spelling
// to a phonetic key lets search and matching meet across all of them.

const DEV_VOWELS: Record<string, string> = {
  "अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo", "ऋ": "ri",
  "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au", "ऑ": "o", "ऍ": "e",
};
const DEV_MATRAS: Record<string, string> = {
  "ा": "aa", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo", "ृ": "ri",
  "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ॉ": "o", "ॅ": "e",
};
const DEV_CONSONANTS: Record<string, string> = {
  "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "n",
  "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "n",
  "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
  "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
  "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
  "य": "y", "र": "r", "ल": "l", "ळ": "l", "व": "v",
  "श": "sh", "ष": "sh", "स": "s", "ह": "h",
  "क़": "q", "ख़": "kh", "ग़": "g", "ज़": "z", "ड़": "r", "ढ़": "rh", "फ़": "f", "य़": "y",
};
const NUKTA_BASE: Record<string, string> = { "क": "क़", "ख": "ख़", "ग": "ग़", "ज": "ज़", "ड": "ड़", "ढ": "ढ़", "फ": "फ़", "य": "य़" };
const VIRAMA = "्";
const NUKTA = "़";

type Phone = { t: string; kind: "C" | "V" | "schwa" };

function transliterateWord(word: string): string {
  const chars = [...word.normalize("NFC")];
  const seq: Phone[] = [];
  for (let i = 0; i < chars.length; i++) {
    let ch = chars[i];
    if (chars[i + 1] === NUKTA && NUKTA_BASE[ch]) {
      ch = NUKTA_BASE[ch];
      i++;
    }
    if (DEV_CONSONANTS[ch]) {
      seq.push({ t: DEV_CONSONANTS[ch], kind: "C" });
      const next = chars[i + 1];
      if (next === VIRAMA) {
        i++;
      } else if (next && DEV_MATRAS[next]) {
        seq.push({ t: DEV_MATRAS[next], kind: "V" });
        i++;
      } else {
        seq.push({ t: "a", kind: "schwa" });
      }
    } else if (DEV_VOWELS[ch]) {
      seq.push({ t: DEV_VOWELS[ch], kind: "V" });
    } else if (ch === "ं" || ch === "ँ") {
      seq.push({ t: "n", kind: "C" });
    } else if (ch === "ः") {
      seq.push({ t: "h", kind: "C" });
    } else if (/[a-z]/i.test(ch)) {
      seq.push({ t: ch.toLowerCase(), kind: /[aeiou]/i.test(ch) ? "V" : "C" });
    }
  }
  // Hindi schwa deletion: the inherent vowel is silent at the end of a word,
  // and in the middle when flanked by vowel-consonant _ consonant-vowel (कमला → kamlaa).
  if (seq.length > 2 && seq[seq.length - 1].kind === "schwa") seq.pop();
  const voweled = (p?: Phone) => p && p.kind !== "C";
  for (let i = seq.length - 3; i >= 2; i--) {
    if (seq[i].kind !== "schwa") continue;
    if (seq[i - 1].kind === "C" && voweled(seq[i - 2]) && seq[i + 1]?.kind === "C" && voweled(seq[i + 2])) {
      seq.splice(i, 1);
      i--;
    }
  }
  return seq.map((p) => p.t).join("");
}

/** "हरि शंकर शर्मा" → "hari shankar sharmaa". Latin text passes through lowercased. */
export function transliterate(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (/[ऀ-ॿ]/.test(w) ? transliterateWord(w) : w.toLowerCase()))
    .join(" ");
}

const PHONETIC_RULES: [RegExp, string][] = [
  [/chh/g, "c"], [/ch/g, "c"], [/sh/g, "s"], [/ph/g, "f"], [/th/g, "t"], [/dh/g, "d"],
  [/bh/g, "b"], [/gh/g, "g"], [/kh/g, "k"], [/jh/g, "j"], [/x/g, "ks"], [/q/g, "k"],
  [/z/g, "j"], [/w/g, "v"], [/ck/g, "k"], [/ee|ii|ie/g, "i"], [/oo|uu/g, "u"],
  [/aa/g, "a"], [/au|ou/g, "o"], [/ai|ey/g, "e"], [/y$/g, "i"],
];

/**
 * Spelling-insensitive key for one name token: aspirates, long vowels and doubled
 * letters collapse, trailing and unstressed medial "a" drop.
 * Kamla / Kamala / कमला → "kaml"; Lakshmi / Laxmi → "laksmi".
 */
export function phoneticKey(token: string) {
  let s = transliterate(token).replace(/[^a-z]/g, "");
  if (!s) return "";
  for (const [re, to] of PHONETIC_RULES) s = s.replace(re, to);
  s = s.replace(/(.)\1+/g, "$1");
  if (s.length > 3 && s.endsWith("a")) s = s.slice(0, -1);
  const vowel = (c?: string) => !!c && "aeiou".includes(c);
  const firstVowel = [...s].findIndex((c) => vowel(c));
  s = [...s]
    .filter((c, i) => !(c === "a" && i > firstVowel && i > 0 && !vowel(s[i - 1]) && s[i + 1] && !vowel(s[i + 1])))
    .join("");
  return s;
}

function phoneticTokens(value: string) {
  return normalizeName(transliterate(stripHonorifics(value)))
    .split(" ")
    .filter(Boolean)
    .map(phoneticKey)
    .filter(Boolean);
}

/**
 * Space-padded bag of phonetic keys for a person — names in every script,
 * compound names joined ("Hari Shankar" also as "harisnkr"), village and gotra —
 * so a search token matches with `contains(" " + key)`.
 */
export function buildSearchKey(p: {
  givenName: string;
  familyName?: string | null;
  nativeName?: string | null;
  alsoKnownAs?: string | null;
  village?: string | null;
  gotra?: string | null;
}) {
  const keys = new Set<string>();
  const names = [p.givenName, p.familyName, p.nativeName, ...(p.alsoKnownAs ?? "").split(",")].filter(
    (v): v is string => Boolean(v && v.trim()),
  );
  for (const n of names) {
    const toks = phoneticTokens(n);
    toks.forEach((t) => keys.add(t));
    if (toks.length >= 2) keys.add(phoneticKey(normalizeName(transliterate(n)).replace(/\s+/g, "")));
  }
  for (const place of [p.village, p.gotra]) for (const t of phoneticTokens(place ?? "")) keys.add(t);
  return keys.size ? ` ${[...keys].join(" ")} ` : "";
}

/** Phonetic tokens of a free-text search query, in any script. */
export function queryKeys(query: string) {
  return [...new Set(phoneticTokens(query))];
}

/** True when two names sound the same once spelling and script are set aside. */
export function samePhonetic(a: string, b: string) {
  const whole = (v: string) => phoneticKey(normalizeName(transliterate(stripHonorifics(v))).replace(/\s+/g, ""));
  const ka = whole(a);
  return Boolean(ka) && ka === whole(b);
}
