"use client";

import Link from "next/link";
import { useMemo } from "react";
import { buildGraph, type Rel } from "@/lib/graph";
import { useCopy } from "@/components/locale";

type Relation = "father" | "mother";
type Step = { key: string; label: string; done: boolean; focusId: string | null; relation: Relation };

/**
 * The next people worth writing. Matches are found mostly through
 * grandparents, so the checklist walks up two generations.
 */
export function GrowCard({
  rootId,
  people,
  rels,
  onAdd,
}: {
  rootId: string;
  people: { id: string; gender: string }[];
  rels: Rel[];
  onAdd: (focusId: string, relation: Relation) => void;
}) {
  const { c } = useCopy();
  const steps = useMemo<Step[]>(() => {
    const g = buildGraph(
      people.map((p) => p.id),
      rels,
    );
    const genderOf = new Map(people.map((p) => [p.id, p.gender]));
    const parentBy = (id: string | null, gender: string) =>
      id ? (g.parents[id] ?? []).find((p) => genderOf.get(p) === gender) ?? null : null;
    const father = parentBy(rootId, "MALE");
    const mother = parentBy(rootId, "FEMALE");
    return [
      { key: "father", label: c.father, done: !!father, focusId: rootId, relation: "father" },
      { key: "mother", label: c.mother, done: !!mother, focusId: rootId, relation: "mother" },
      { key: "dada", label: c.growDada, done: !!parentBy(father, "MALE"), focusId: father, relation: "father" },
      { key: "dadi", label: c.growDadi, done: !!parentBy(father, "FEMALE"), focusId: father, relation: "mother" },
      { key: "nana", label: c.growNana, done: !!parentBy(mother, "MALE"), focusId: mother, relation: "father" },
      { key: "nani", label: c.growNani, done: !!parentBy(mother, "FEMALE"), focusId: mother, relation: "mother" },
    ];
  }, [rootId, people, rels, c]);

  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) {
    return (
      <div className="rounded-2xl border border-grow/30 bg-grow/5 p-4 text-sm">
        <p className="text-ink/75">{c.growDone}</p>
        <Link href="/find" className="mt-2 inline-block font-medium text-brand underline underline-offset-4">
          {c.findMore} →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line/35 bg-canvas/60 p-4">
      <div className="flex items-baseline justify-between">
        <p className="font-display text-lg font-bold tracking-tight text-ink">{c.growTitle}</p>
        <span className="text-xs text-muted">
          {done}/{steps.length}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line/20" aria-hidden>
        <div className="h-full rounded-full bg-grow transition-all" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ink/60">{c.growHint}</p>
      <ul className="mt-3 space-y-1">
        {steps.map((s) => (
          <li key={s.key}>
            {s.done ? (
              <span className="flex items-center gap-2 px-1 py-1 text-sm text-ink/50 line-through decoration-line/60">
                <span className="text-grow" aria-hidden>✓</span> {s.label}
              </span>
            ) : (
              <button
                type="button"
                disabled={!s.focusId}
                onClick={() => s.focusId && onAdd(s.focusId, s.relation)}
                className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left text-sm text-brand hover:bg-line/15 disabled:cursor-not-allowed disabled:text-ink/35 disabled:hover:bg-transparent"
              >
                <span aria-hidden>+</span> {s.label}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
