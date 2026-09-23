"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TreeCanvas, type TreeCanvasHandle } from "@/components/tree/tree-canvas";
import { KinList } from "@/components/tree/kin-list";
import { GrowCard } from "@/components/tree/grow-card";
import { InviteInline } from "@/components/tree/invite-inline";
import { emptyPerson, PersonForm, type PersonFields } from "@/components/person-form";
import { useCopy } from "@/components/locale";
import { fill } from "@/lib/i18n";
import type { LayoutPerson } from "@/lib/tree-layout";
import type { Rel } from "@/lib/graph";
import { kinshipMap, type Kin } from "@/lib/kinship";
import { generationOf } from "@/lib/sides";

type Person = LayoutPerson & {
  birthDate?: string | null;
  birthYear?: number | null;
  village?: string;
  gotra?: string;
  alsoKnownAs?: string;
  notes?: string;
  birthPlace?: string;
  deathDate?: string | null;
  isLiving: boolean;
  external?: boolean;
  family?: string | null;
};

const RELS = ["father", "mother", "spouse", "child", "sibling"] as const;
type Relation = (typeof RELS)[number];

function formFor(p: Person): PersonFields {
  return {
    givenName: p.givenName,
    familyName: p.familyName,
    nativeName: p.nativeName,
    alsoKnownAs: p.alsoKnownAs ?? "",
    gender: p.gender,
    birthDate: p.birthDate ?? "",
    village: p.village ?? "",
    gotra: p.gotra ?? "",
    isLiving: p.isLiving,
    birthPlace: p.birthPlace ?? "",
    deathDate: p.deathDate ?? "",
    notes: p.notes ?? "",
  };
}

function TreeInner() {
  const { c, locale } = useCopy();
  const params = useSearchParams();
  const canvas = useRef<TreeCanvasHandle>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [rels, setRels] = useState<Rel[]>([]);
  const [rootId, setRootId] = useState<string | null>(null);
  const [viewFrom, setViewFrom] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<"edit" | "add">("edit");
  const [relation, setRelation] = useState<Relation>("father");
  const [form, setForm] = useState<PersonFields>(emptyPerson());
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"canvas" | "list">("canvas");
  const [showLinked, setShowLinked] = useState(params.get("linked") === "1");
  const [linkedCount, setLinkedCount] = useState(0);

  const selectedRef = useRef<string | null>(null);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  /** Select a person and load their record into the editor. */
  const select = useCallback(
    (id: string | null, list?: Person[]) => {
      setSelected(id);
      setMode("edit");
      setError("");
      const p = (list ?? people).find((x) => x.id === id);
      if (p) setForm(formFor(p));
    },
    [people],
  );

  /** Reload the tree; `pick` chooses the selection afterwards (defaults to the current one). */
  const load = useCallback(
    async (pick?: string | null) => {
      const res = await fetch(`/api/tree${showLinked ? "?linked=1" : ""}`);
      if (res.status === 409) {
        window.location.href = "/onboarding";
        return;
      }
      const data = await res.json();
      const list: Person[] = data.people || [];
      setPeople(list);
      setRels(data.relationships || []);
      setRootId(data.focusId);
      setLinkedCount((data.linkedFamilies ?? []).length);
      setViewFrom((v) => (v && list.some((p) => p.id === v) ? v : data.focusId));
      const wanted = params.get("person");
      const keep = selectedRef.current && list.some((p) => p.id === selectedRef.current) ? selectedRef.current : null;
      const next = pick ?? keep ?? (wanted && list.some((p) => p.id === wanted) ? wanted : data.focusId);
      setSelected(next);
      const p = list.find((x) => x.id === next);
      if (p) setForm(formFor(p));
    },
    [params, showLinked],
  );

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const current = people.find((p) => p.id === selected);

  // Kinship is always read from "you", whichever person the tree is viewed from.
  const kin = useMemo<Map<string, Kin>>(
    () => (rootId ? kinshipMap(rootId, people, rels) : new Map()),
    [rootId, people, rels],
  );
  const labels = useMemo(() => {
    const m = new Map<string, string>();
    for (const [id, k] of kin) m.set(id, k.hi);
    return m;
  }, [kin]);

  const stats = useMemo(() => {
    const gens = new Set<number>();
    for (const k of kin.values()) gens.add(generationOf(k));
    return {
      people: people.length,
      generations: gens.size,
      living: people.filter((p) => p.isLiving).length,
      remembered: people.filter((p) => !p.isLiving).length,
      external: people.filter((p) => p.external).length,
    };
  }, [people, kin]);

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return people
      .filter((p) =>
        [p.displayName, p.nativeName, p.alsoKnownAs, p.village, labels.get(p.id)]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [query, people, labels]);

  function jumpTo(id: string) {
    select(id);
    setQuery("");
    if (view === "canvas") canvas.current?.centerOn(id, 1);
  }

  function startAdd(focusId: string, rel: Relation) {
    const focus = people.find((p) => p.id === focusId);
    setSelected(focusId);
    setMode("add");
    setRelation(rel);
    setError("");
    setForm({
      ...emptyPerson(),
      familyName: rel === "father" || rel === "sibling" || rel === "child" ? focus?.familyName ?? "" : "",
      village: focus?.village ?? "",
      gotra: rel === "father" || rel === "sibling" ? focus?.gotra ?? "" : "",
      gender: rel === "father" ? "MALE" : rel === "mother" ? "FEMALE" : "UNKNOWN",
    });
    if (view === "canvas") canvas.current?.centerOn(focusId);
  }

  async function saveEdit() {
    if (!selected) return;
    setError("");
    setBusy(true);
    const res = await fetch(`/api/people/${selected}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, birthDate: form.birthDate || null, deathDate: form.deathDate || null }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not save.");
      return;
    }
    await load();
  }

  async function addRel() {
    if (!selected) return;
    setError("");
    setBusy(true);
    const res = await fetch(`/api/people/${selected}/relatives`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ relation, ...form, birthDate: form.birthDate || null }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not add.");
      return;
    }
    await load(data.person?.id ?? null);
  }

  async function remove() {
    if (!selected) return;
    if (!confirm(c.deleteConfirmPerson)) return;
    const res = await fetch(`/api/people/${selected}`, { method: "DELETE" });
    if (res.ok) {
      if (viewFrom === selected) setViewFrom(rootId);
      await load(rootId);
    }
  }

  const currentKin = current ? kin.get(current.id) : null;
  const own = people.filter((p) => !p.external);

  return (
    <div className="grid grid-cols-1 lg:h-[calc(100vh-64px)] lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="relative h-[62vh] min-w-0 overflow-hidden dot-grid lg:h-full">
        <div className="pointer-events-none absolute left-3 right-3 top-3 z-10 flex flex-wrap items-start gap-2">
          <div className="pointer-events-auto relative w-full max-w-xs">
            <input
              className="field !rounded-full !py-2 shadow-card"
              placeholder={c.search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && hits[0]) jumpTo(hits[0].id);
                if (e.key === "Escape") setQuery("");
              }}
              aria-label={c.search}
            />
            {hits.length > 0 && (
              <ul className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-2xl border border-line/40 bg-surface shadow-card">
                {hits.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm hover:bg-line/15"
                      onClick={() => jumpTo(p.id)}
                    >
                      <span className="truncate">
                        {p.displayName}
                        {p.nativeName && <span className="ml-2 font-devanagari text-brand-soft">{p.nativeName}</span>}
                      </span>
                      <span className="shrink-0 font-devanagari text-xs text-muted">{labels.get(p.id)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
            <div className="inline-flex rounded-full border border-line/40 bg-surface/90 p-0.5" role="tablist">
              {(["canvas", "list"] as const).map((v) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  className={`rounded-full px-3 py-1 ${view === v ? "bg-brand text-surface" : "text-brand"}`}
                >
                  {v === "canvas" ? c.viewCanvas : c.viewList}
                </button>
              ))}
            </div>
            {linkedCount > 0 && (
              <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-grow/40 bg-surface/90 px-3 py-1 text-grow">
                <input
                  type="checkbox"
                  className="accent-grow"
                  checked={showLinked}
                  onChange={(e) => setShowLinked(e.target.checked)}
                />
                {c.showLinked} · {linkedCount}
              </label>
            )}
            <span className="rounded-full border border-line/30 bg-surface/80 px-2.5 py-1">
              {stats.people} {c.people}
            </span>
            <span className="rounded-full border border-line/30 bg-surface/80 px-2.5 py-1">
              {stats.generations} {c.generations}
            </span>
            <span className="rounded-full border border-line/30 bg-surface/80 px-2.5 py-1">
              <span className="text-grow">●</span> {stats.living} · <span>○</span> {stats.remembered}
            </span>
            {showLinked && stats.external > 0 && (
              <span className="rounded-full border border-dashed border-grow/50 bg-surface/80 px-2.5 py-1 text-grow">
                {fill(c.linkedCount, { n: stats.external })}
              </span>
            )}
          </div>
        </div>
        <p className="pointer-events-none absolute bottom-3 left-3 z-10 max-w-xs text-[11px] leading-snug text-muted">
          {c.privacyNote}
        </p>
        {viewFrom && people.length > 0 ? (
          view === "canvas" ? (
            <TreeCanvas
              ref={canvas}
              people={people}
              relationships={rels}
              focusId={viewFrom}
              selectedId={selected}
              labels={labels}
              onSelect={(id) => select(id)}
            />
          ) : (
            <KinList people={people} kin={kin} selectedId={selected} onSelect={(id) => select(id)} />
          )
        ) : (
          <div className="grid h-full place-items-center text-brand">{c.emptyTree}</div>
        )}
      </div>

      <aside className="border-t border-line/25 bg-surface p-5 lg:overflow-y-auto lg:border-l lg:border-t-0">
        {current && (
          <>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink">{current.displayName}</h2>
              <span className="text-[10px] uppercase tracking-widest text-muted">
                {current.isRoot ? c.rootBadge : current.isLiving ? c.living : c.departed}
              </span>
            </div>
            {current.nativeName && <p className="font-devanagari text-brand-soft">{current.nativeName}</p>}
            {currentKin && !current.isRoot && (
              <p className="mt-2 rounded-xl border border-line/30 bg-canvas/60 px-3 py-2 text-sm">
                <span className="field-label !mb-0.5">{c.relation}</span>
                <span className="font-devanagari text-lg text-brand">{currentKin.hi}</span>
                <span className="ml-2 text-xs text-ink/60">{currentKin.en}</span>
              </p>
            )}
            {!currentKin && !current.isRoot && <p className="mt-2 text-xs text-danger">{c.notConnected}</p>}

            {current.external ? (
              <div className="mt-4 space-y-3">
                {current.family && (
                  <p className="inline-block rounded-full border border-dashed border-grow/50 px-3 py-1 text-xs text-grow">
                    {fill(c.fromFamily, { name: current.family })}
                  </p>
                )}
                {(current.village || current.gotra) && (
                  <p className="text-sm text-ink/70">
                    {[current.village, current.gotra].filter(Boolean).join(" · ")}
                  </p>
                )}
                <p className="text-xs leading-relaxed text-muted">{c.externalHint}</p>
                {viewFrom !== current.id && (
                  <button className="rounded-full border border-line/40 px-3 py-1 text-xs" onClick={() => setViewFrom(current.id)}>
                    {c.viewFrom}
                  </button>
                )}
              </div>
            ) : (
              <>
                {current.isRoot && mode === "edit" && rootId && (
                  <div className="mt-4">
                    <GrowCard rootId={rootId} people={people} rels={rels} onAdd={startAdd} />
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className={`rounded-full px-3 py-1 text-xs ${mode === "edit" ? "bg-brand text-surface" : "border border-line/40"}`}
                    onClick={() => select(current.id)}
                  >
                    {c.save}
                  </button>
                  <button
                    className={`rounded-full px-3 py-1 text-xs ${mode === "add" ? "bg-brand text-surface" : "border border-line/40"}`}
                    onClick={() => startAdd(current.id, relation)}
                  >
                    {c.addRelative}
                  </button>
                  {viewFrom !== current.id ? (
                    <button className="rounded-full border border-line/40 px-3 py-1 text-xs" onClick={() => setViewFrom(current.id)}>
                      {c.viewFrom}
                    </button>
                  ) : viewFrom !== rootId ? (
                    <button className="rounded-full border border-line/40 px-3 py-1 text-xs" onClick={() => setViewFrom(rootId)}>
                      {c.backToYou}
                    </button>
                  ) : null}
                </div>

                {mode === "add" && (
                  <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label={c.addRelative}>
                    {RELS.map((r) => (
                      <button
                        key={r}
                        role="radio"
                        aria-checked={relation === r}
                        onClick={() => startAdd(current.id, r)}
                        className={`rounded-full px-3 py-1 text-xs ${relation === r ? "bg-grow text-surface" : "border border-line/40"}`}
                      >
                        {c[r]}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-5">
                  <PersonForm locale={locale} value={form} onChange={setForm} extra />
                </div>
                {error && <p className="mt-3 text-sm text-danger">{error}</p>}
                <button
                  className="btn-primary mt-5 w-full"
                  onClick={mode === "add" ? addRel : saveEdit}
                  disabled={busy || !form.givenName}
                >
                  {mode === "add" ? c.addRelative : c.save}
                </button>
                {mode === "edit" && !current.isRoot && current.isLiving && (
                  <InviteInline key={current.id} personId={current.id} name={current.givenName} />
                )}
                {mode === "edit" && !current.isRoot && (
                  <button className="mt-4 w-full text-xs text-danger" onClick={remove}>
                    {c.delete}
                  </button>
                )}
                {own.length > 1 && (
                  <Link href="/find" className="mt-5 block rounded-2xl border border-line/30 px-4 py-3 text-sm text-brand hover:bg-line/10">
                    {c.findMore} →
                  </Link>
                )}
              </>
            )}
          </>
        )}
      </aside>
    </div>
  );
}

export default function TreePage() {
  return (
    <Suspense>
      <TreeInner />
    </Suspense>
  );
}
