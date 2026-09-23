import { buildGraph, type Rel } from "./graph";

/**
 * GEDCOM 5.5.1 export — the lineage-linked format every genealogy program
 * reads. This is the owner's own copy of their tree, so private dates are
 * included; it is never sent to another family.
 */

export type GedcomPerson = {
  id: string;
  givenName: string;
  familyName: string;
  nativeName: string;
  alsoKnownAs: string;
  gender: string;
  birthDate?: string | null;
  birthPlace: string;
  deathDate?: string | null;
  isLiving: boolean;
  village: string;
  gotra: string;
  notes: string;
};

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** 1995-03-12 → "12 MAR 1995"; partial or odd values are passed through as a phrase. */
export function gedcomDate(iso?: string | null) {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return `(${iso})`;
  const [, y, mo, d] = m;
  const month = MONTHS[Number(mo) - 1];
  if (!month) return `(${iso})`;
  return `${Number(d)} ${month} ${y}`;
}

/** GEDCOM lines are limited in length; long text continues with CONC/CONT. */
function text(level: number, tag: string, value: string) {
  const lines: string[] = [];
  const parts = value.split(/\r?\n/);
  parts.forEach((part, i) => {
    const chunks = part.match(/.{1,200}/g) ?? [""];
    chunks.forEach((chunk, j) => {
      const t = i === 0 && j === 0 ? tag : j === 0 ? "CONT" : "CONC";
      const l = i === 0 && j === 0 ? level : level + 1;
      lines.push(`${l} ${t} ${chunk}`.trimEnd());
    });
  });
  return lines;
}

export function toGedcom(people: GedcomPerson[], rels: Rel[], opts: { title?: string; now?: Date } = {}) {
  const now = opts.now ?? new Date();
  const ids = new Map(people.map((p, i) => [p.id, `@I${i + 1}@`]));
  const g = buildGraph(
    people.map((p) => p.id),
    rels.filter((r) => ids.has(r.fromId) && ids.has(r.toId)),
  );

  // A FAM record is one couple (or lone parent) and their shared children.
  type Fam = { husb?: string; wife?: string; partners: string[]; children: Set<string> };
  const fams = new Map<string, Fam>();
  const famKey = (partners: string[]) => [...partners].sort().join("+");
  const famFor = (partners: string[]) => {
    const key = famKey(partners);
    let f = fams.get(key);
    if (!f) {
      f = { partners: [...partners].sort(), children: new Set() };
      const male = partners.find((p) => byId.get(p)?.gender === "MALE");
      const female = partners.find((p) => byId.get(p)?.gender === "FEMALE" && p !== male);
      f.husb = male ?? partners.find((p) => p !== female);
      f.wife = female ?? partners.find((p) => p !== f!.husb);
      fams.set(key, f);
    }
    return f;
  };
  const byId = new Map(people.map((p) => [p.id, p]));

  for (const p of people) for (const s of g.spouses[p.id] ?? []) famFor([p.id, s]);
  for (const p of people) {
    const parents = g.parents[p.id] ?? [];
    if (!parents.length) continue;
    // Prefer the parents' own marriage; otherwise a family per parent.
    const married = parents.length === 2 && (g.spouses[parents[0]] ?? []).includes(parents[1]);
    if (married || parents.length === 1) famFor(parents).children.add(p.id);
    else for (const par of parents) famFor([par]).children.add(p.id);
  }
  const famIds = new Map([...fams.keys()].map((k, i) => [k, `@F${i + 1}@`]));

  const out: string[] = [];
  out.push("0 HEAD");
  out.push("1 SOUR MeraVansh");
  out.push("2 NAME Mera Vansh — Family Tree");
  out.push("2 VERS 1.0");
  out.push("1 DEST ANY");
  out.push(`1 DATE ${gedcomDate(now.toISOString().slice(0, 10))}`);
  out.push("1 GEDC");
  out.push("2 VERS 5.5.1");
  out.push("2 FORM LINEAGE-LINKED");
  out.push("1 CHAR UTF-8");
  if (opts.title) out.push(...text(1, "NOTE", opts.title));

  for (const p of people) {
    out.push(`0 ${ids.get(p.id)} INDI`);
    out.push(`1 NAME ${p.givenName} /${p.familyName}/`.trimEnd());
    if (p.givenName) out.push(`2 GIVN ${p.givenName}`);
    if (p.familyName) out.push(`2 SURN ${p.familyName}`);
    if (p.nativeName) {
      out.push(`1 NAME ${p.nativeName}`);
      out.push("2 TYPE native");
    }
    for (const aka of p.alsoKnownAs.split(",").map((s) => s.trim()).filter(Boolean)) {
      out.push(`1 NAME ${aka}`);
      out.push("2 TYPE aka");
    }
    out.push(`1 SEX ${p.gender === "MALE" ? "M" : p.gender === "FEMALE" ? "F" : "U"}`);
    if (p.birthDate || p.birthPlace) {
      out.push("1 BIRT");
      const d = gedcomDate(p.birthDate);
      if (d) out.push(`2 DATE ${d}`);
      if (p.birthPlace) out.push(`2 PLAC ${p.birthPlace}`);
    }
    if (!p.isLiving) {
      out.push("1 DEAT Y");
      const d = gedcomDate(p.deathDate);
      if (d) out.push(`2 DATE ${d}`);
    }
    if (p.village) out.push(`1 RESI`, `2 PLAC ${p.village}`);
    if (p.gotra) out.push(`1 FACT ${p.gotra}`, "2 TYPE Gotra");
    if (p.notes) out.push(...text(1, "NOTE", p.notes));
    for (const [key, f] of fams) {
      if (f.partners.includes(p.id)) out.push(`1 FAMS ${famIds.get(key)}`);
    }
    for (const [key, f] of fams) {
      if (f.children.has(p.id)) out.push(`1 FAMC ${famIds.get(key)}`);
    }
  }

  for (const [key, f] of fams) {
    out.push(`0 ${famIds.get(key)} FAM`);
    if (f.husb) out.push(`1 HUSB ${ids.get(f.husb)}`);
    if (f.wife && f.wife !== f.husb) out.push(`1 WIFE ${ids.get(f.wife)}`);
    for (const c of f.children) out.push(`1 CHIL ${ids.get(c)}`);
  }

  out.push("0 TRLR");
  return out.join("\r\n") + "\r\n";
}
