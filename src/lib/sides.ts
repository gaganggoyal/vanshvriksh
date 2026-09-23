import type { Kin } from "./kinship";

export type Side = "self" | "paternal" | "maternal" | "descendants" | "inlaws" | "unconnected";

export const SIDES: Side[] = ["self", "paternal", "maternal", "descendants", "inlaws", "unconnected"];

/**
 * Which side of the family a relative belongs to, read from the path that
 * reaches them: through father (पितृ पक्ष), through mother (मातृ पक्ष), down
 * to children, or through a spouse (ससुराल). Siblings and their children stay with you.
 */
export function sideOf(kin: Kin | undefined, genderOf: (id: string) => string | undefined): Side {
  if (!kin) return "unconnected";
  const path = kin.path;
  if (!path.length) return "self";
  const first = path[0];
  if (first.via === "spouse") return path.length === 1 ? "self" : "inlaws";
  if (first.via === "down") return "descendants";
  if (path.length >= 2 && path[1].via === "down") return "self";
  const g = genderOf(first.id);
  if (g === "FEMALE") return "maternal";
  if (g === "MALE") return "paternal";
  return "self";
}

/** Generation relative to you: negative above, positive below. */
export function generationOf(kin: Kin) {
  return kin.path.reduce((s, x) => s + (x.via === "up" ? -1 : x.via === "down" ? 1 : 0), 0);
}
