"use client";

import { useMemo } from "react";
import type { Kin } from "@/lib/kinship";
import { generationOf, sideOf, SIDES, type Side } from "@/lib/sides";
import { useCopy } from "@/components/locale";

type P = {
  id: string;
  displayName: string;
  nativeName: string;
  initials: string;
  gender: string;
  isLiving: boolean;
  isRoot: boolean;
  external?: boolean;
  family?: string | null;
};

export function KinList({
  people,
  kin,
  selectedId,
  onSelect,
}: {
  people: P[];
  kin: Map<string, Kin>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { c } = useCopy();
  const groups = useMemo(() => {
    const genderOf = (id: string) => people.find((p) => p.id === id)?.gender;
    const out = new Map<Side, P[]>(SIDES.map((s) => [s, []]));
    for (const p of people) out.get(sideOf(kin.get(p.id), genderOf))!.push(p);
    for (const list of out.values()) {
      list.sort((a, b) => {
        const ka = kin.get(a.id);
        const kb = kin.get(b.id);
        return (ka ? generationOf(ka) : 99) - (kb ? generationOf(kb) : 99) || a.displayName.localeCompare(b.displayName);
      });
    }
    return out;
  }, [people, kin]);

  const title: Record<Side, string> = {
    self: c.sideSelf,
    paternal: c.sidePaternal,
    maternal: c.sideMaternal,
    descendants: c.sideDescendants,
    inlaws: c.sideInLaws,
    unconnected: c.sideUnconnected,
  };

  return (
    <div className="h-full overflow-y-auto px-4 pb-10 pt-24 sm:px-6">
      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
        {SIDES.map((side) => {
          const list = groups.get(side)!;
          if (!list.length) return null;
          return (
            <section key={side} className="card-paper rounded-3xl p-4">
              <h3 className="flex items-baseline justify-between px-1 font-display text-lg text-maroon">
                {title[side]}
                <span className="text-xs text-gold-dim">{list.length}</span>
              </h3>
              <ul className="mt-2 divide-y divide-gold/15">
                {list.map((p) => {
                  const k = kin.get(p.id);
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(p.id)}
                        aria-current={p.id === selectedId ? "true" : undefined}
                        className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-gold/10 ${
                          p.id === selectedId ? "bg-gold/15" : ""
                        }`}
                      >
                        <span
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                            p.external ? "border border-dashed border-gold-dim" : ""
                          } ${p.gender === "FEMALE" ? "bg-maroon/15 text-maroon" : p.gender === "MALE" ? "bg-leaf/15 text-leaf" : "bg-gold/20 text-gold-dim"}`}
                        >
                          {p.initials}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {p.displayName}
                            {!p.isLiving && <span className="ml-1 text-gold-dim">○</span>}
                          </span>
                          <span className="block truncate text-xs text-ink/55">
                            {p.nativeName && <span className="font-devanagari">{p.nativeName}</span>}
                            {p.external && p.family && <span> · {p.family}</span>}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block font-devanagari text-sm text-maroon">{p.isRoot ? c.rootBadge : k?.hi}</span>
                          {k && !p.isRoot && <span className="block max-w-[10rem] truncate text-[10px] text-gold-dim">{k.en}</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
