"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCopy } from "@/components/locale";
import { fill, type Copy } from "@/lib/i18n";

type Side = { id: string; displayName: string; nativeName: string; village: string; gender: string };

type MatchRow = {
  id: string;
  status: string;
  score: number;
  source: string;
  reasonCodes: { code: string; label: string }[];
  mine: Side;
  theirs: Side;
  sharedRelatives: string[];
  confirmedByMe: boolean;
  confirmedByThem: boolean;
  linked: { parents: string[]; spouses: string[]; children: string[] } | null;
  bridge: { hi: string | null; en: string | null; name: string | null; adds: number; female: boolean } | null;
};

function reasonText(c: Copy, r: { code: string; label: string }) {
  const key = `rs_${r.code}` as keyof Copy;
  return (c[key] as string | undefined) ?? r.label;
}

export default function MatchesPage() {
  const { c } = useCopy();
  const [rows, setRows] = useState<MatchRow[] | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch("/api/matches");
    const data = await res.json();
    setRows(data.matches || []);
  }
  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, []);

  async function act(id: string, action: "confirm" | "dismiss") {
    const res = await fetch(`/api/matches/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setMsg(data.awaitingOther ? c.awaitingOther : "");
    await load();
  }

  const pending = rows?.filter((m) => m.status === "PENDING") ?? [];
  const rest = rows?.filter((m) => m.status !== "PENDING") ?? [];

  return (
    <div className="relative z-10 mx-auto max-w-4xl px-5 pb-16 pt-8">
      <p className="font-devanagari text-sm text-muted">{c.matchesAlt}</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-ink">{c.matches}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/70">{c.matchIntro}</p>
      <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">{c.matchesHint}</p>
      {msg && (
        <p className="mt-4 rounded-2xl border border-grow/30 bg-grow/5 px-4 py-3 text-sm text-grow" role="status">
          {msg}
        </p>
      )}

      <div className="mt-8 space-y-5">
        {[...pending, ...rest].map((m) => (
          <MatchCard key={m.id} m={m} c={c} onAct={act} />
        ))}
        {rows && !rows.length && (
          <div className="rounded-3xl border border-dashed border-line/40 p-8 text-center">
            <p className="text-sm text-ink/70">{c.noMatches}</p>
            <Link href="/find" className="btn-primary mt-4">
              {c.find}
            </Link>
          </div>
        )}
      </div>

      {rows && rows.length > 0 && (
        <Link href="/find" className="mt-8 inline-block text-sm text-brand underline underline-offset-4">
          {c.findMore} →
        </Link>
      )}
    </div>
  );
}

/** Render a sentence with a styled kinship term where "{term}" sat — word order differs by language. */
function WithTerm({ text, term }: { text: string; term: React.ReactNode }) {
  const [before, after = ""] = text.split("\u0000");
  return (
    <>
      {before}
      {term}
      {after}
    </>
  );
}

function MatchCard({ m, c, onAct }: { m: MatchRow; c: Copy; onAct: (id: string, a: "confirm" | "dismiss") => void }) {
  const b = m.bridge;
  return (
    <article className={`card rounded-3xl p-6 ${m.status === "DISMISSED" ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-line/20 px-3 py-1 text-[11px] uppercase tracking-wider text-muted">
            {c.score} {Math.min(99, m.score)}%
          </span>
          {m.source !== "auto" && (
            <span className="rounded-full border border-line/40 px-3 py-1 text-[11px] text-brand">
              {m.source === "invite" ? c.sourceInvite : c.sourceSearch}
            </span>
          )}
        </div>
        <span
          className={`text-xs uppercase tracking-wider ${m.status === "CONFIRMED" ? "text-grow" : m.status === "DISMISSED" ? "text-muted" : "text-brand"}`}
        >
          {m.status === "CONFIRMED" ? c.confirmed : m.status === "DISMISSED" ? c.dismissed : c.pending}
        </span>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <div>
          <p className="field-label">{c.yourTree}</p>
          <p className="font-display text-xl">{m.mine.displayName}</p>
          <p className="font-devanagari text-brand-soft">{m.mine.nativeName}</p>
        </div>
        <span className="hidden text-2xl text-line md:block" aria-hidden>
          ⇄
        </span>
        <div>
          <p className="field-label">{c.theirTree}</p>
          <p className="font-display text-xl">{m.theirs.displayName}</p>
          <p className="font-devanagari text-brand-soft">{m.theirs.nativeName}</p>
        </div>
      </div>

      {b && (b.hi || b.adds > 0) && (
        <div className={`mt-5 rounded-2xl px-4 py-3 ${m.status === "CONFIRMED" ? "bg-grow/10" : "bg-canvas/70"}`}>
          {b.hi && (
            <p className="text-sm text-ink/80">
              <WithTerm
                text={
                  m.status === "CONFIRMED" && b.name
                    ? fill(b.female ? c.bridgeConfirmedF : c.bridgeConfirmed, { name: b.name, term: "\u0000" })
                    : fill(b.female ? c.bridgePendingF : c.bridgePending, { term: "\u0000" })
                }
                term={
                  <>
                    <span className="font-devanagari text-lg text-brand">{b.hi}</span>
                    {b.en && <span className="mx-1 text-xs text-ink/55">· {b.en}</span>}
                  </>
                }
              />
            </p>
          )}
          {b.adds > 0 && (
            <p className="mt-1 text-xs text-grow">{fill(m.status === "CONFIRMED" ? c.added : c.wouldAdd, { n: b.adds })}</p>
          )}
        </div>
      )}

      {!!m.sharedRelatives.length && (
        <p className="mt-3 text-sm text-ink/70">
          {c.shared}: {m.sharedRelatives.join(", ")}
        </p>
      )}
      <ul className="mt-3 flex flex-wrap gap-2">
        {m.reasonCodes.map((r) => (
          <li key={r.code} className="rounded-full border border-line/30 px-3 py-1 text-xs text-muted">
            {reasonText(c, r)}
          </li>
        ))}
      </ul>

      {m.status === "CONFIRMED" && m.linked && (
        <div className="mt-5 rounded-2xl border border-grow/30 bg-grow/5 p-4">
          <p className="field-label !text-grow">{c.linkedKin}</p>
          <p className="text-xs text-ink/60">{c.theirRelatives}</p>
          <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-3">
            {(["parents", "spouses", "children"] as const).map((k) =>
              m.linked![k].length ? (
                <div key={k}>
                  <dt className="text-[11px] uppercase tracking-wider text-muted">
                    {k === "parents" ? c.parentsLabel : k === "spouses" ? c.spouse : c.childrenLabel}
                  </dt>
                  <dd>{m.linked![k].join(", ")}</dd>
                </div>
              ) : null,
            )}
          </dl>
          <Link
            href={`/tree?linked=1&person=${m.mine.id}`}
            className="mt-3 inline-block text-sm font-medium text-grow underline underline-offset-4"
          >
            {c.seeOnTree} →
          </Link>
        </div>
      )}
      {m.status === "PENDING" && m.confirmedByThem && !m.confirmedByMe && (
        <p className="mt-3 text-sm text-grow">{c.theyConfirmed}</p>
      )}
      {m.status === "PENDING" && m.confirmedByMe && <p className="mt-3 text-sm text-muted">{c.youConfirmed}</p>}
      {m.status === "PENDING" && !m.confirmedByMe && (
        <div className="mt-5 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => onAct(m.id, "confirm")}>
            {c.confirmMatch}
          </button>
          <button className="btn-ghost" onClick={() => onAct(m.id, "dismiss")}>
            {c.dismissMatch}
          </button>
        </div>
      )}
      {m.status === "PENDING" && m.confirmedByMe && (
        <div className="mt-3">
          <button className="text-xs text-danger" onClick={() => onAct(m.id, "dismiss")}>
            {c.dismissMatch}
          </button>
        </div>
      )}
    </article>
  );
}
