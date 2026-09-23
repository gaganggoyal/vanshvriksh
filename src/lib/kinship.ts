import { buildGraph, type Rel } from "./graph";

/**
 * Kinship terms relative to one person (the "ego"), in English and Hindi.
 *
 * Hindi distinguishes what English folds together: father's brother (चाचा/ताऊ)
 * from mother's brother (मामा), son's children (पोता/पोती) from daughter's
 * (नाती/नातिन), elder from younger. We walk the shortest blood-first path
 * from ego to the relative and read the term off its shape.
 */

export type KinPerson = {
  id: string;
  gender: string;
  birthYear?: number | null;
};

export type Kin = {
  /** English description, e.g. "father's younger brother". */
  en: string;
  /** Hindi term, e.g. "चाचा". */
  hi: string;
  /** Steps from ego: up = to a parent, down = to a child, spouse. */
  path: Step[];
  /** Blood relatives share descent; affinal relatives are joined by marriage. */
  blood: boolean;
};

export type Step = { via: "up" | "down" | "spouse"; id: string };

const MAX_DEPTH = 6;

type Sex = "M" | "F" | "?";

function sexOf(p?: KinPerson | null): Sex {
  if (!p) return "?";
  if (p.gender === "MALE") return "M";
  if (p.gender === "FEMALE") return "F";
  return "?";
}

/** Pick the gendered form: [male, female, unknown]. */
function g(sex: Sex, m: string, f: string, u = `${m} / ${f}`) {
  return sex === "M" ? m : sex === "F" ? f : u;
}

/** Elder / younger relative to a reference person, by birth year; null when unknown. */
function elder(a?: KinPerson | null, b?: KinPerson | null): boolean | null {
  if (!a?.birthYear || !b?.birthYear || a.birthYear === b.birthYear) return null;
  return a.birthYear < b.birthYear;
}

function findPath(
  egoId: string,
  targetId: string,
  graph: ReturnType<typeof buildGraph>,
): Step[] | null {
  if (egoId === targetId) return [];
  // Breadth-first so the shortest path wins; blood edges are expanded before
  // marriage edges so, at equal length, a blood reading is preferred.
  const prev = new Map<string, Step & { from: string }>();
  const queue: { id: string; depth: number }[] = [{ id: egoId, depth: 0 }];
  const seen = new Set([egoId]);
  while (queue.length) {
    const { id, depth } = queue.shift()!;
    if (depth >= MAX_DEPTH) continue;
    const next: Step[] = [
      ...(graph.parents[id] ?? []).map((p) => ({ via: "up" as const, id: p })),
      ...(graph.children[id] ?? []).map((c) => ({ via: "down" as const, id: c })),
      ...(graph.spouses[id] ?? []).map((s) => ({ via: "spouse" as const, id: s })),
    ];
    for (const step of next) {
      if (seen.has(step.id)) continue;
      seen.add(step.id);
      prev.set(step.id, { ...step, from: id });
      if (step.id === targetId) {
        const path: Step[] = [];
        let cur = targetId;
        while (cur !== egoId) {
          const s = prev.get(cur)!;
          path.unshift({ via: s.via, id: s.id });
          cur = s.from;
        }
        return path;
      }
      queue.push({ id: step.id, depth: depth + 1 });
    }
  }
  return null;
}

function describe(path: Step[], ego: KinPerson, people: Map<string, KinPerson>): Kin {
  const at = (i: number) => people.get(path[i]?.id);
  const target = at(path.length - 1);
  const tSex = sexOf(target);
  const shape = path.map((s) => s.via).join(",");
  const blood = !path.some((s) => s.via === "spouse");
  const done = (en: string, hi: string) => ({ en, hi, path, blood });

  if (path.length === 0) return done("you", "आप");

  // ---- Direct line ---------------------------------------------------------
  if (shape === "up") return done(g(tSex, "father", "mother", "parent"), g(tSex, "पिता", "माता", "अभिभावक"));
  if (shape === "down") return done(g(tSex, "son", "daughter", "child"), g(tSex, "बेटा", "बेटी", "संतान"));
  if (shape === "spouse") return done(g(tSex, "husband", "wife", "spouse"), g(tSex, "पति", "पत्नी", "जीवनसाथी"));

  if (shape === "up,up") {
    const viaFather = sexOf(at(0)) === "M";
    const viaMother = sexOf(at(0)) === "F";
    if (viaFather) return done(g(tSex, "paternal grandfather", "paternal grandmother", "paternal grandparent"), g(tSex, "दादा", "दादी", "दादा / दादी"));
    if (viaMother) return done(g(tSex, "maternal grandfather", "maternal grandmother", "maternal grandparent"), g(tSex, "नाना", "नानी", "नाना / नानी"));
    return done(g(tSex, "grandfather", "grandmother", "grandparent"), g(tSex, "दादा / नाना", "दादी / नानी", "दादा / नाना"));
  }
  if (shape === "up,up,up") {
    const paternal = sexOf(at(0)) === "M" && sexOf(at(1)) === "M";
    const maternal = sexOf(at(0)) === "F" && sexOf(at(1)) === "M";
    if (paternal) return done(g(tSex, "paternal great-grandfather", "paternal great-grandmother", "great-grandparent"), g(tSex, "परदादा", "परदादी", "परदादा / परदादी"));
    if (maternal) return done(g(tSex, "maternal great-grandfather", "maternal great-grandmother", "great-grandparent"), g(tSex, "परनाना", "परनानी", "परनाना / परनानी"));
    return done(g(tSex, "great-grandfather", "great-grandmother", "great-grandparent"), g(tSex, "परदादा / परनाना", "परदादी / परनानी", "परदादा / परनाना"));
  }

  if (shape === "down,down") {
    const viaSon = sexOf(at(0)) === "M";
    const viaDaughter = sexOf(at(0)) === "F";
    if (viaSon) return done(g(tSex, "grandson (son's son)", "granddaughter (son's daughter)", "grandchild"), g(tSex, "पोता", "पोती", "पोता / पोती"));
    if (viaDaughter) return done(g(tSex, "grandson (daughter's son)", "granddaughter (daughter's daughter)", "grandchild"), g(tSex, "नाती", "नातिन", "नाती / नातिन"));
    return done(g(tSex, "grandson", "granddaughter", "grandchild"), g(tSex, "पोता / नाती", "पोती / नातिन", "पोता / नाती"));
  }
  if (shape === "down,down,down") {
    const viaSon = sexOf(at(0)) === "M";
    return done(
      g(tSex, "great-grandson", "great-granddaughter", "great-grandchild"),
      viaSon ? g(tSex, "परपोता", "परपोती", "परपोता / परपोती") : g(tSex, "परनाती", "परनातिन", "परनाती / परनातिन"),
    );
  }

  // ---- Siblings and their families --------------------------------------
  if (shape === "up,down") {
    const isElder = elder(target, ego);
    const en = g(tSex, "brother", "sister", "sibling");
    const hi =
      isElder === true ? g(tSex, "बड़े भाई", "बड़ी बहन", "बड़े भाई-बहन")
      : isElder === false ? g(tSex, "छोटा भाई", "छोटी बहन", "छोटे भाई-बहन")
      : g(tSex, "भाई", "बहन", "भाई-बहन");
    return done(isElder === null ? en : `${isElder ? "elder" : "younger"} ${en}`, hi);
  }
  if (shape === "up,down,spouse") {
    const sib = at(1);
    const sibSex = sexOf(sib);
    if (sibSex === "M") return done("brother's wife", elder(sib, ego) === false ? "भाभी (छोटे भाई की पत्नी)" : "भाभी");
    if (sibSex === "F") return done("sister's husband", "जीजा");
    return done("sibling's spouse", "भाभी / जीजा");
  }
  if (shape === "up,down,down") {
    const sibSex = sexOf(at(1));
    if (sibSex === "M") return done(g(tSex, "nephew (brother's son)", "niece (brother's daughter)", "brother's child"), g(tSex, "भतीजा", "भतीजी", "भतीजा / भतीजी"));
    if (sibSex === "F") return done(g(tSex, "nephew (sister's son)", "niece (sister's daughter)", "sister's child"), g(tSex, "भांजा", "भांजी", "भांजा / भांजी"));
    return done(g(tSex, "nephew", "niece", "sibling's child"), g(tSex, "भतीजा / भांजा", "भतीजी / भांजी", "भतीजा / भांजा"));
  }
  if (shape === "up,down,down,spouse") {
    const sibSex = sexOf(at(1));
    const kidSex = sexOf(at(2));
    const hi = sibSex === "M" ? g(kidSex, "भतीज-बहू", "भतीज-दामाद") : g(kidSex, "भांज-बहू", "भांज-दामाद");
    return done(g(kidSex, "nephew's wife", "niece's husband", "nephew or niece's spouse"), hi);
  }
  if (shape === "up,down,down,down") {
    return done(g(tSex, "grand-nephew", "grand-niece", "sibling's grandchild"), "भतीजे / भांजे की संतान");
  }

  // ---- Parents' siblings (uncles, aunts) and cousins -------------------
  if (shape === "up,up,down" || shape === "up,up,down,spouse") {
    const parent = at(0);
    const pSex = sexOf(parent);
    const uncle = at(2);
    const uSex = sexOf(uncle);
    const isSpouse = shape.endsWith("spouse");
    const older = elder(uncle, parent);
    if (pSex === "M") {
      if (uSex === "M") {
        const hiU = older === true ? "ताऊ" : older === false ? "चाचा" : "चाचा / ताऊ";
        const hiW = older === true ? "ताई" : older === false ? "चाची" : "चाची / ताई";
        const enU = older === true ? "father's elder brother" : older === false ? "father's younger brother" : "father's brother";
        return isSpouse ? done(`${enU}'s wife`, hiW) : done(enU, hiU);
      }
      if (uSex === "F") return isSpouse ? done("father's sister's husband", "फूफा") : done("father's sister", "बुआ");
      return isSpouse ? done("father's sibling's spouse", "चाची / फूफा") : done("father's sibling", "चाचा / बुआ");
    }
    if (pSex === "F") {
      if (uSex === "M") return isSpouse ? done("mother's brother's wife", "मामी") : done("mother's brother", "मामा");
      if (uSex === "F") return isSpouse ? done("mother's sister's husband", "मौसा") : done("mother's sister", "मौसी");
      return isSpouse ? done("mother's sibling's spouse", "मामी / मौसा") : done("mother's sibling", "मामा / मौसी");
    }
    return isSpouse ? done("uncle or aunt by marriage", "चाची / मामी") : done(g(uSex, "uncle", "aunt", "uncle or aunt"), g(uSex, "चाचा / मामा", "बुआ / मौसी", "चाचा / मामा"));
  }
  if (shape === "up,up,down,down" || shape === "up,up,down,down,spouse") {
    const pSex = sexOf(at(0));
    const uSex = sexOf(at(2));
    const cousin = at(3);
    const cSex = sexOf(cousin);
    const isSpouse = shape.endsWith("spouse");
    const isElder = elder(cousin, ego);
    let hiRoot = "";
    let enSide = "cousin";
    if (pSex === "M" && uSex === "M") { hiRoot = "चचेर"; enSide = "cousin (father's brother's child)"; }
    else if (pSex === "M" && uSex === "F") { hiRoot = "फुफेर"; enSide = "cousin (father's sister's child)"; }
    else if (pSex === "F" && uSex === "M") { hiRoot = "ममेर"; enSide = "cousin (mother's brother's child)"; }
    else if (pSex === "F" && uSex === "F") { hiRoot = "मौसेर"; enSide = "cousin (mother's sister's child)"; }
    if (isSpouse) {
      const hi = hiRoot ? g(cSex, `${hiRoot}ी भाभी`, `${hiRoot}ा जीजा`) : g(cSex, "भाभी", "जीजा");
      return done(g(cSex, "cousin's wife", "cousin's husband", "cousin's spouse"), hi);
    }
    if (!hiRoot) return done(enSide, g(cSex, "चचेरा / ममेरा भाई", "चचेरी / ममेरी बहन", "चचेरे / ममेरे भाई-बहन"));
    const hi = g(
      cSex,
      isElder === true ? `${hiRoot}े बड़े भाई` : `${hiRoot}ा भाई`,
      isElder === true ? `${hiRoot}ी बड़ी बहन` : `${hiRoot}ी बहन`,
      `${hiRoot}े भाई-बहन`,
    );
    return done(enSide, hi);
  }
  if (shape === "up,up,down,down,down") {
    return done(g(tSex, "cousin's son", "cousin's daughter", "cousin's child"), g(tSex, "भतीजा", "भतीजी", "भतीजा / भतीजी"));
  }
  if (shape === "up,up,up,down" || shape === "up,up,up,down,spouse") {
    const paternal = sexOf(at(0)) === "M";
    const isSpouse = shape.endsWith("spouse");
    const s = isSpouse ? sexOf(at(3)) : tSex;
    const en = `${paternal ? "paternal" : "maternal"} great-${g(s, "uncle", "aunt", "uncle or aunt")}${isSpouse ? "'s spouse" : ""}`;
    // A grandparent's siblings are addressed as grandparents too.
    const hi = paternal
      ? isSpouse ? g(s, "दादी", "दादा") : g(s, "दादा", "दादी", "दादा / दादी")
      : isSpouse ? g(s, "नानी", "नाना") : g(s, "नाना", "नानी", "नाना / नानी");
    return done(en, hi);
  }
  if (shape === "up,up,up,down,down") {
    // Parent's cousin — addressed like a parent's sibling.
    const pSex = sexOf(at(0));
    const uSex = tSex;
    if (pSex === "M") return done("father's cousin", g(uSex, "चाचा / ताऊ", "बुआ", "चाचा / बुआ"));
    if (pSex === "F") return done("mother's cousin", g(uSex, "मामा", "मौसी", "मामा / मौसी"));
    return done("parent's cousin", "चाचा / मामा");
  }

  // ---- In-laws -----------------------------------------------------------
  if (shape === "spouse,up") return done(g(tSex, "father-in-law", "mother-in-law", "parent-in-law"), g(tSex, "ससुर", "सास", "ससुर / सास"));
  if (shape === "spouse,up,up") return done(g(tSex, "spouse's grandfather", "spouse's grandmother", "spouse's grandparent"), g(tSex, "दादा ससुर", "दादी सास", "दादा ससुर / दादी सास"));
  if (shape === "spouse,up,down" || shape === "spouse,up,down,spouse") {
    const spouse = at(0);
    const spSex = sexOf(spouse);
    const sib = at(2);
    const sibSex = sexOf(sib);
    const isSpouse = shape.endsWith("spouse");
    const older = elder(sib, spouse);
    if (spSex === "M") {
      if (sibSex === "M") {
        const hi = older === true ? (isSpouse ? "जेठानी" : "जेठ") : older === false ? (isSpouse ? "देवरानी" : "देवर") : isSpouse ? "जेठानी / देवरानी" : "जेठ / देवर";
        return done(isSpouse ? "husband's brother's wife" : "husband's brother", hi);
      }
      if (sibSex === "F") return done(isSpouse ? "husband's sister's husband" : "husband's sister", isSpouse ? "ननदोई" : "ननद");
    }
    if (spSex === "F") {
      if (sibSex === "M") return done(isSpouse ? "wife's brother's wife" : "wife's brother", isSpouse ? "सलहज" : "साला");
      if (sibSex === "F") return done(isSpouse ? "wife's sister's husband" : "wife's sister", isSpouse ? "साढ़ू" : "साली");
    }
    return done(isSpouse ? "spouse's sibling's spouse" : g(sibSex, "brother-in-law", "sister-in-law", "sibling-in-law"), isSpouse ? "साढ़ू / सलहज" : "देवर / साला / ननद / साली");
  }
  if (shape === "spouse,up,down,down") {
    return done(g(tSex, "spouse's nephew", "spouse's niece", "spouse's sibling's child"), g(tSex, "भतीजा / भांजा", "भतीजी / भांजी", "भतीजे / भांजे"));
  }
  if (shape === "down,spouse") return done(g(tSex, "son-in-law", "daughter-in-law", "child-in-law"), g(tSex, "दामाद", "बहू", "दामाद / बहू"));
  if (shape === "down,spouse,up") return done(g(tSex, "child's father-in-law", "child's mother-in-law", "child's parent-in-law"), g(tSex, "समधी", "समधन", "समधी / समधन"));
  if (shape === "down,down,spouse") return done(g(tSex, "grandson-in-law", "granddaughter-in-law", "grandchild's spouse"), g(tSex, "नाती-दामाद", "पोत-बहू", "पोत-बहू / नाती-दामाद"));
  if (shape === "up,spouse") {
    // Step-parent: parent's spouse who is not our parent.
    return done(g(tSex, "stepfather", "stepmother", "step-parent"), g(tSex, "सौतेले पिता", "सौतेली माँ", "सौतेले अभिभावक"));
  }
  if (shape === "spouse,down") return done(g(tSex, "stepson", "stepdaughter", "stepchild"), g(tSex, "सौतेला बेटा", "सौतेली बेटी", "सौतेली संतान"));
  if (shape === "spouse,spouse") return done("spouse's other spouse", "सौत");

  // ---- Fallback: describe by generation -----------------------------------
  const gen = path.reduce((s, x) => s + (x.via === "up" ? -1 : x.via === "down" ? 1 : 0), 0);
  if (gen <= -4) return done("distant ancestor", "पूर्वज");
  if (gen >= 4) return done("distant descendant", "वंशज");
  return done(blood ? "distant relative" : "relative by marriage", blood ? "दूर के रिश्तेदार" : "रिश्तेदार");
}

/** Kinship term of `targetId` as seen from `egoId`; null when not connected. */
export function kinship(
  egoId: string,
  targetId: string,
  people: KinPerson[],
  rels: Rel[],
): Kin | null {
  const map = new Map(people.map((p) => [p.id, p]));
  const graph = buildGraph(
    people.map((p) => p.id),
    rels,
  );
  const ego = map.get(egoId);
  if (!ego) return null;
  const path = findPath(egoId, targetId, graph);
  if (!path) return null;
  return describe(path, ego, map);
}

/** Terms for every person in one pass — the graph is built once. */
export function kinshipMap(egoId: string, people: KinPerson[], rels: Rel[]) {
  const map = new Map(people.map((p) => [p.id, p]));
  const graph = buildGraph(
    people.map((p) => p.id),
    rels,
  );
  const ego = map.get(egoId);
  const out = new Map<string, Kin>();
  if (!ego) return out;
  for (const p of people) {
    const path = findPath(egoId, p.id, graph);
    if (path) out.set(p.id, describe(path, ego, map));
  }
  return out;
}
