"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCopy } from "@/components/locale";
import { fill } from "@/lib/i18n";
import { kinshipMap } from "@/lib/kinship";
import { samePhonetic } from "@/lib/names";
import type { Rel } from "@/lib/graph";
import { avatarTone } from "@/lib/avatar";

type Result = {
  id: string;
  displayName: string;
  nativeName: string;
  initials: string;
  gender: string;
  isLiving: boolean;
  village: string;
  gotra: string;
  familySize: number;
  around: { parents: string[]; spouses: string[]; children: string[]; livingRelatives: number };
  status: string | null;
};

type Mine = { id: string; displayName: string; gender: string; birthYear?: number | null; isRoot: boolean };
type Places = { villages: { name: string; count: number }[]; gotras: { name: string; count: number }[] };

const RELATIONS = ["father", "mother", "spouse", "child", "sibling"] as const;

function FindInner() {
  const { c } = useCopy();
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [year, setYear] = useState(params.get("year") ?? "");
  const [results, setResults] = useState<Result[] | null>(null);
  const [places, setPlaces] = useState<Places | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mine, setMine] = useState<Mine[]>([]);
  const [rels, setRels] = useState<Rel[]>([]);
  const [rootId, setRootId] = useState<string | null>(null);

  const run = useCallback(async (query: string, yr: string) => {
    setBusy(true);
    setError("");
    const qs = new URLSearchParams();
    if (query.trim()) qs.set("q", query.trim());
    if (yr.trim()) qs.set("year", yr.trim());
    const res = await fetch(`/api/find?${qs}`);
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Search failed.");
      return;
    }
    if (data.places) setPlaces(data.places);
    setResults(query.trim() ? data.results : null);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void run(params.get("q") ?? "", params.get("year") ?? "");
      void fetch("/api/tree")
        .then((r) => r.json())
        .then((d) => {
          setMine(d.people ?? []);
          setRels(d.relationships ?? []);
          setRootId(d.focusId ?? null);
        });
    }, 0);
    return () => clearTimeout(t);
  }, [params, run]);

  const kin = useMemo(() => (rootId ? kinshipMap(rootId, mine, rels) : new Map()), [rootId, mine, rels]);
  const labelOf = (p: Mine) => {
    const k = kin.get(p.id);
    return p.isRoot ? `${p.displayName} — ${c.rootBadge}` : k ? `${p.displayName} — ${k.hi}` : p.displayName;
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const qs = new URLSearchParams();
    if (q.trim()) qs.set("q", q.trim());
    if (year.trim()) qs.set("year", year.trim());
    router.replace(`/find?${qs}`);
    void run(q, year);
  }

  function browse(term: string) {
    setQ(term);
    router.replace(`/find?q=${encodeURIComponent(term)}`);
    void run(term, year);
  }

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-5 pb-16 pt-8">
      <p className="text-xs uppercase tracking-[0.3em] text-muted">
        Find · <span className="font-devanagari normal-case tracking-normal">खोज</span>
      </p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">{c.findTitle}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/70">{c.findIntro}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <form onSubmit={submit} className="card rounded-3xl p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="block flex-1">
                <span className="sr-only">{c.findPlaceholder}</span>
                <input
                  className="field !py-3 !text-base"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={c.findPlaceholder}
                  autoFocus
                />
              </label>
              <label className="block sm:w-32">
                <span className="field-label">{c.findYear}</span>
                <input
                  className="field !py-3"
                  inputMode="numeric"
                  maxLength={4}
                  value={year}
                  onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="1974"
                  aria-describedby="year-hint"
                />
              </label>
              <button className="btn-primary !py-3 sm:!px-7" disabled={busy || !q.trim()}>
                {busy ? "…" : c.findButton}
              </button>
            </div>
            <p id="year-hint" className="mt-2 text-xs text-muted">
              {c.findYear}: {c.findYearHint}
            </p>
          </form>

          {error && <p className="mt-4 text-sm text-danger">{error}</p>}

          {results && (
            <div className="mt-6 space-y-4" aria-live="polite">
              {results.map((r) => (
                <ResultCard key={r.id} r={r} mine={mine} labelOf={labelOf} birthYear={year ? Number(year) : null} />
              ))}
              {!results.length && (
                <div className="rounded-3xl border border-dashed border-line/40 p-8 text-center text-sm text-ink/70">
                  {c.findNone}
                </div>
              )}
            </div>
          )}

          {!results && places && (places.villages.length > 0 || places.gotras.length > 0) && (
            <section className="mt-8">
              <h2 className="font-display text-xl font-bold tracking-tight text-ink">{c.findBrowse}</h2>
              {[
                [c.villagesLabel, places.villages],
                [c.gotrasLabel, places.gotras],
              ].map(([label, list]) =>
                (list as Places["villages"]).length ? (
                  <div key={label as string} className="mt-4">
                    <p className="field-label">{label as string}</p>
                    <div className="flex flex-wrap gap-2">
                      {(list as Places["villages"]).map((v) => (
                        <button
                          key={v.name}
                          type="button"
                          onClick={() => browse(v.name)}
                          className="rounded-full border border-line/40 bg-surface px-3 py-1.5 text-sm text-brand transition hover:border-brand/40 hover:bg-line/10"
                        >
                          {v.name} <span className="text-xs text-muted">{v.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null,
              )}
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-line/30 bg-canvas/60 p-5">
            <p className="font-display text-lg font-bold tracking-tight text-ink">{c.findRulesTitle}</p>
            <ul className="mt-3 space-y-3 text-sm leading-relaxed text-ink/75">
              <li className="flex gap-2"><span className="text-muted">○</span>{c.findRule1}</li>
              <li className="flex gap-2"><span className="text-grow">●</span>{c.findRule2}</li>
              <li className="flex gap-2"><span className="text-brand">◇</span>{c.findRule3}</li>
            </ul>
          </div>
          <Link href="/matches" className="block rounded-3xl border border-line/30 p-5 text-sm text-brand hover:bg-line/10">
            {c.matches} →
          </Link>
        </aside>
      </div>
    </div>
  );
}

function ResultCard({
  r,
  mine,
  labelOf,
  birthYear,
}: {
  r: Result;
  mine: Mine[];
  labelOf: (p: Mine) => string;
  birthYear: number | null;
}) {
  const { c } = useCopy();
  const guess = mine.find((m) => samePhonetic(m.displayName, r.displayName));
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"same" | "add">(guess ? "same" : "add");
  const [myPersonId, setMyPersonId] = useState(guess?.id ?? mine.find((m) => m.isRoot)?.id ?? "");
  const [focusId, setFocusId] = useState(mine.find((m) => m.isRoot)?.id ?? "");
  const [relation, setRelation] = useState<(typeof RELATIONS)[number]>("father");
  const [status, setStatus] = useState(r.status);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    setErr("");
    const body =
      mode === "same"
        ? { mode, personId: r.id, myPersonId: myPersonId || mine.find((m) => m.isRoot)?.id, birthYear }
        : { mode, personId: r.id, focusId: focusId || mine.find((m) => m.isRoot)?.id, relation, birthYear };
    const res = await fetch("/api/find/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setErr(data.error || "Could not send.");
      return;
    }
    setStatus(data.status);
    setOpen(false);
    setMsg(c.linkSent);
  }

  const around = [
    [c.parentsLabel, r.around.parents],
    [c.spouse, r.around.spouses],
    [c.childrenLabel, r.around.children],
  ] as const;

  return (
    <article className="card rounded-3xl p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <span
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-semibold ${avatarTone(r.id)}`}
          aria-hidden
        >
          {r.initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="font-display text-xl text-ink">{r.displayName}</h3>
            {r.nativeName && <span className="font-devanagari text-brand-soft">{r.nativeName}</span>}
          </div>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            <span>{r.isLiving ? <><span className="text-grow">●</span> {c.living}</> : <>○ {c.departed}</>}</span>
            {r.village && <span>{r.village}</span>}
            {r.gotra && <span>{r.gotra}</span>}
            <span>{fill(c.inAFamilyOf, { n: r.familySize })}</span>
          </p>
        </div>
        {status && (
          <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] uppercase tracking-wider ${status === "CONFIRMED" || status === "LINKED_FAMILY" ? "bg-grow/15 text-grow" : "bg-line/20 text-muted"}`}>
            {status === "CONFIRMED"
              ? c.confirmed
              : status === "LINKED_FAMILY"
                ? c.inLinkedFamily
                : status === "DISMISSED"
                  ? c.dismissed
                  : c.waitingForThem}
          </span>
        )}
      </div>

      {(around.some(([, names]) => names.length) || r.around.livingRelatives > 0) && (
        <div className="mt-4 rounded-2xl bg-canvas/60 px-4 py-3">
          <p className="field-label !mb-1">{c.aroundThem}</p>
          <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
            {around.map(([label, names]) =>
              names.length ? (
                <div key={label}>
                  <dt className="text-[11px] uppercase tracking-wider text-muted">{label}</dt>
                  <dd>{names.join(", ")}</dd>
                </div>
              ) : null,
            )}
          </dl>
          {r.around.livingRelatives > 0 && (
            <p className="mt-1 text-xs text-ink/55">{fill(c.livingRelatives, { n: r.around.livingRelatives })}</p>
          )}
        </div>
      )}

      {msg && <p className="mt-3 text-sm text-grow">{msg}</p>}

      {!status && !open && (
        <button className="btn-primary mt-4" onClick={() => setOpen(true)}>
          {c.thisIsMyRelative}
        </button>
      )}

      {open && (
        <div className="mt-4 rounded-2xl border border-line/35 p-4">
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {(["same", "add"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={`rounded-full px-3 py-1.5 text-xs ${mode === m ? "bg-brand text-surface" : "border border-line/40 text-brand"}`}
              >
                {m === "same" ? c.sameAs : c.addAs}
              </button>
            ))}
          </div>
          {mode === "same" ? (
            <label className="mt-3 block">
              <span className="field-label">{c.sameAs}</span>
              <select className="field" value={myPersonId} onChange={(e) => setMyPersonId(e.target.value)}>
                {mine.map((m) => (
                  <option key={m.id} value={m.id}>
                    {labelOf(m)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="field-label">{c.asTheir}</span>
                <select className="field" value={relation} onChange={(e) => setRelation(e.target.value as (typeof RELATIONS)[number])}>
                  {RELATIONS.map((rel) => (
                    <option key={rel} value={rel}>
                      {c[rel]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="field-label">{c.whose}</span>
                <select className="field" value={focusId} onChange={(e) => setFocusId(e.target.value)}>
                  {mine.map((m) => (
                    <option key={m.id} value={m.id}>
                      {labelOf(m)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {err && <p className="mt-3 text-sm text-danger">{err}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-primary" disabled={busy} onClick={send}>
              {c.sendToFamily}
            </button>
            <button className="btn-ghost" onClick={() => setOpen(false)}>
              {c.cancel}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export default function FindPage() {
  return (
    <Suspense>
      <FindInner />
    </Suspense>
  );
}
