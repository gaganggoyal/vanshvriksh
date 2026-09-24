"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Download,
  EyeOff,
  Handshake,
  Languages,
  Lock,
  Mail,
  Network,
  PenLine,
  PlayCircle,
  ScanSearch,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";
import { useCopy } from "@/components/locale";
import { FamilyTour } from "@/components/tour/family-tour";
import { fill } from "@/lib/i18n";

type Stats = { families: number; people: number; remembered: number; linked: number };
type Teaser = { people: number; families: number; places: string[] };

const KIN: [string, string][] = [
  ["दादा", "father's father"],
  ["नानी", "mother's mother"],
  ["ताऊ", "father's elder brother"],
  ["चाचा", "father's younger brother"],
  ["बुआ", "father's sister"],
  ["मामा", "mother's brother"],
  ["मौसी", "mother's sister"],
  ["चचेरा भाई", "father's brother's son"],
  ["ममेरी बहन", "mother's brother's daughter"],
  ["जेठ", "husband's elder brother"],
  ["साला", "wife's brother"],
  ["नातिन", "daughter's daughter"],
];

function useTeaser(q: string) {
  const [result, setResult] = useState<Teaser | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const term = q.trim();
    const t = setTimeout(async () => {
      if (term.length < 2) {
        setResult(null);
        return;
      }
      setLoading(true);
      const res = await fetch(`/api/public/search?q=${encodeURIComponent(term)}`);
      setLoading(false);
      if (res.ok) setResult(await res.json());
    }, 350);
    return () => clearTimeout(t);
  }, [q]);
  return { result, loading };
}

/** A tiny, true-to-life picture of the product: a tree that grew through a linked family. */
function ProductVisual() {
  const { c } = useCopy();
  const node = (left: string, top: string, initials: string, name: string, term: string, tone: string, extra = "") => (
    <div
      className={`absolute flex w-[31%] items-center gap-2 rounded-xl border bg-white px-2.5 py-2 shadow-card ${extra}`}
      style={{ left, top }}
    >
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold ${tone}`}>{initials}</span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[11px] font-semibold text-ink sm:text-xs">{name}</span>
        <span className="block font-devanagari text-[10px] text-brand">{term}</span>
      </span>
    </div>
  );
  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <div className="absolute -inset-6 -z-10 rounded-[40px] bg-gradient-to-br from-brand/25 via-fuchsia-300/20 to-emerald-300/25 blur-2xl" />
      <div className="overflow-hidden rounded-3xl border border-ink/[0.08] bg-white shadow-lift">
        <div className="flex items-center gap-1.5 border-b border-ink/[0.06] px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-ink/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink/10" />
          <span className="ml-3 rounded-md bg-canvas px-2.5 py-0.5 text-[11px] text-muted">meravansh.lol/tree</span>
        </div>
        <div className="dot-grid relative aspect-[5/4]">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 80" preserveAspectRatio="none" aria-hidden>
            <g fill="none" strokeWidth="0.45" strokeLinejoin="round">
              <line x1="33" y1="6.3" x2="38" y2="6.3" stroke="#A7A3BC" />
              <path d="M35.5 6.3 V 27.2" stroke="#A7A3BC" />
              <path d="M35.5 19 H 16.5 V 51.2" stroke="#A7A3BC" />
              <path d="M84 15.1 V 21 H 68.5 V 27.2" stroke="#34C79A" strokeDasharray="1.4 1" />
              <line x1="51" y1="31.2" x2="53" y2="31.2" stroke="#A7A3BC" />
              <path d="M52 31.2 V 44 H 51.5 V 51.2" stroke="#5B4BF5" strokeWidth="0.6" />
            </g>
          </svg>
          {node("2%", "3%", "HS", "Harishankar", "दादा", "bg-violet-100 text-violet-700")}
          {node("38%", "3%", "KD", "Kamla Devi", "दादी", "bg-amber-100 text-amber-700")}
          {node("68.5%", "9%", "RT", "Ramprasad", "नाना", "bg-emerald-100 text-emerald-700", "border-dashed border-grow-soft")}
          {node("20%", "34%", "RS", "Rajesh", "पिता", "bg-sky-100 text-sky-700")}
          {node("53%", "34%", "ST", "Sunita", "माता", "bg-rose-100 text-rose-700")}
          {node("36%", "64%", "PS", "Priya", "आप", "bg-brand text-white", "ring-2 ring-brand/30")}
          {node("1%", "64%", "AS", "Arjun", "चचेरे भाई", "bg-teal-100 text-teal-700")}
        </div>
      </div>

      <div className="absolute -bottom-8 -left-3 hidden w-[62%] animate-float sm:block rounded-2xl border border-ink/[0.08] bg-white/95 p-3.5 shadow-lift backdrop-blur sm:-left-10">
        <div className="flex items-center justify-between text-[11px] font-semibold">
          <span className="inline-flex items-center gap-1 text-brand">
            <Sparkles className="h-3.5 w-3.5" /> {c.matches}
          </span>
          <span className="rounded-full bg-grow-tint px-2 py-0.5 text-grow">{c.confirmed}</span>
        </div>
        <p className="mt-2 text-xs text-ink">
          <span className="font-devanagari">हरिशंकर शर्मा</span> <span className="text-muted">⇄</span> Hari Shankar Sharma
        </p>
        <p className="mt-2 rounded-lg bg-canvas px-2.5 py-1.5 text-[11px] text-ink/80">
          Arjun Sharma — <span className="font-devanagari font-semibold text-brand">चचेरे बड़े भाई</span>
        </p>
      </div>
      <div className="absolute -right-2 -top-4 rounded-xl border border-grow-soft/40 bg-white px-3 py-2 text-[11px] font-semibold text-grow shadow-card sm:-right-6">
        +3 · <span className="font-devanagari">नाना · नानी · मामा</span>
      </div>
    </div>
  );
}

export function Landing({ stats, demo }: { stats: Stats; demo: boolean }) {
  const { c, locale } = useCopy();
  const [q, setQ] = useState("");
  const { result, loading } = useTeaser(q);
  const findHref = `/login?next=${encodeURIComponent(`/find?q=${q.trim()}`)}`;

  const steps = [
    { icon: PenLine, title: c.how1Title, body: c.how1 },
    { icon: ScanSearch, title: c.how2Title, body: c.how2 },
    { icon: Handshake, title: c.how3Title, body: c.how3 },
    { icon: Network, title: c.how4Title, body: c.how4 },
  ];
  const promises = [
    { icon: EyeOff, title: c.privacy1Title, body: c.privacy1 },
    { icon: Users, title: c.privacy2Title, body: c.privacy2 },
    { icon: Handshake, title: c.privacy3Title, body: c.privacy3 },
    { icon: Download, title: c.privacy4Title, body: c.privacy4 },
  ];
  const faqs = [
    [c.faq1q, c.faq1a],
    [c.faq2q, c.faq2a],
    [c.faq3q, c.faq3a],
    [c.faq4q, c.faq4a],
    [c.faq5q, c.faq5a],
  ];
  const chips = [
    { icon: Languages, label: c.featHindi },
    { icon: Mail, label: c.featNoPassword },
    { icon: Download, label: c.featGedcom },
    { icon: Smartphone, label: c.featPhone },
  ];

  return (
    <div className="relative overflow-x-clip">
      {/* Hero */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-x-0 -top-24 -z-10 h-[520px] bg-[radial-gradient(60%_60%_at_20%_20%,rgba(91,75,245,0.16),transparent),radial-gradient(40%_50%_at_85%_10%,rgba(52,199,154,0.14),transparent)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-12 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
          <div className="animate-rise">
            <span className="eyebrow">
              <ShieldCheck className="h-3.5 w-3.5" /> {c.featNoPassword}
            </span>
            <h1 className="mt-5 font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-tight text-ink sm:text-6xl lg:text-[4.1rem]">
              {c.heroTitle}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink/65 sm:text-lg">{c.heroBody}</p>

            <form
              className="mt-8 max-w-xl"
              onSubmit={(e) => {
                e.preventDefault();
                if (q.trim()) window.location.href = findHref;
              }}
            >
              <label htmlFor="teaser" className="mb-2 block text-sm font-semibold text-ink/80">
                {c.teaserLabel}
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-ink/10 bg-white p-1.5 pl-4 shadow-card focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15">
                <Search className="h-5 w-5 shrink-0 text-muted" aria-hidden />
                <input
                  id="teaser"
                  className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none placeholder:text-muted/70"
                  placeholder={c.teaserPlaceholder}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  autoComplete="off"
                />
                <button className="btn-primary !rounded-xl !px-4" disabled={!q.trim()}>
                  {c.findButton}
                </button>
              </div>
              <div className="min-h-[3rem] px-1 pt-3 text-sm" aria-live="polite">
                {loading && <span className="text-muted">…</span>}
                {!loading && result && result.people > 0 && (
                  <p className="text-ink/80">
                    {fill(result.families === 1 ? c.teaserResultOne : c.teaserResult, {
                      people: result.people,
                      families: result.families,
                    })}
                    {result.places.length > 0 && (
                      <span className="text-muted">
                        {" "}
                        {c.teaserPlaces} {result.places.join(", ")}.
                      </span>
                    )}{" "}
                    <Link href={findHref} className="inline-flex items-center gap-1 font-semibold text-brand hover:underline">
                      {c.teaserCta} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </p>
                )}
                {!loading && result && result.people === 0 && <p className="text-muted">{c.teaserNone}</p>}
              </div>
            </form>

            <div className="mt-2 flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary !px-6 !py-3">
                {c.begin} <ArrowRight className="h-4 w-4" />
              </Link>
              {demo && (
                <Link href="/login?demo=1" className="btn-ghost !px-6 !py-3">
                  {c.demo}
                </Link>
              )}
              <a href="#tour" className="inline-flex items-center gap-2 px-2 py-3 text-sm font-semibold text-brand hover:underline">
                <PlayCircle className="h-5 w-5" /> {c.tourWatch}
              </a>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink/60">
              {[c.perk2, c.featHindi, c.perk3].map((p) => (
                <li key={p} className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-grow" /> {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="animate-rise [animation-delay:120ms]">
            <ProductVisual />
          </div>
        </div>
      </section>

      {/* Live numbers — shown once there is something worth counting */}
      {stats.families >= 20 && (
        <section className="border-y border-ink/[0.06] bg-white">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-5 py-10 sm:grid-cols-4">
            {(
              [
                [stats.families, c.statsFamilies],
                [stats.people, c.statsPeople],
                [stats.remembered, c.statsRemembered],
                [stats.linked, c.statsLinked],
              ] as const
            ).map(([v, label]) => (
              <div key={label} className="text-center">
                <div className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{v.toLocaleString("en-IN")}</div>
                <div className="mt-1 text-sm text-muted">{label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* The 30-second tour */}
      <section id="tour" className="mx-auto max-w-5xl scroll-mt-20 px-5 pt-16 lg:pt-20">
        <div className="text-center">
          <span className="eyebrow">
            <PlayCircle className="h-3.5 w-3.5" /> {c.tourEyebrow}
          </span>
          <h2 className="mx-auto mt-4 max-w-3xl font-display text-3xl font-bold tracking-tight sm:text-5xl">{c.tourTitle}</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-ink/65">{c.tourBody}</p>
        </div>
        <div className="mt-10">
          <FamilyTour />
        </div>
        <p className="mt-4 text-center text-sm">
          <a href={`/media/mera-vansh-tour-${locale}.mp4`} download className="inline-flex items-center gap-1.5 font-semibold text-brand hover:underline">
            <Download className="h-4 w-4" /> {c.tourDownload}
          </a>
        </p>
      </section>

      {/* How relatives are found */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
        <span className="eyebrow">{c.navHow}</span>
        <h2 className="mt-4 max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-5xl">{c.howTitle}</h2>
        <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="card relative rounded-3xl p-6 transition hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-tint text-brand">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-display text-sm font-bold text-ink/20">0{i + 1}</span>
              </div>
              <h3 className="mt-5 text-lg font-bold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/65">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Kinship */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="pointer-events-none absolute -left-40 top-0 h-[480px] w-[480px] rounded-full bg-brand/40 blur-[120px]" />
        <div className="pointer-events-none absolute -right-32 bottom-0 h-[360px] w-[360px] rounded-full bg-emerald-400/20 blur-[120px]" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-24 lg:grid-cols-[1fr_1.25fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-brand-light">
              <Languages className="h-3.5 w-3.5" /> हिन्दी · English
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-5xl">{c.kinTitle}</h2>
            <p className="mt-5 max-w-md leading-relaxed text-white/70">{c.kinBody}</p>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {KIN.map(([hi, en]) => (
              <li
                key={hi}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 backdrop-blur transition hover:border-brand-light/40 hover:bg-white/[0.07]"
              >
                <span className="block font-devanagari text-xl font-semibold text-white">{hi}</span>
                <span className="mt-0.5 block text-xs leading-snug text-white/55">{en}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Privacy */}
      <section id="privacy" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
        <span className="eyebrow">
          <Lock className="h-3.5 w-3.5" /> {c.navPrivacy}
        </span>
        <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-5xl">{c.privacyTitle}</h2>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {promises.map(({ icon: Icon, title, body }) => (
            <article key={title} className="card flex gap-4 rounded-3xl p-6">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-grow-tint text-grow">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold tracking-tight">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink/65">{body}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-ink/[0.08] bg-white p-6">
            <p className="text-sm font-semibold text-ink/70">{c.othersSee}</p>
            <p className="mt-2 leading-relaxed">{c.othersSeeList}</p>
          </div>
          <div className="rounded-3xl border border-brand/15 bg-brand-tint p-6">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-brand">
              <Lock className="h-4 w-4" /> {c.onlyYouSee}
            </p>
            <p className="mt-2 leading-relaxed">{c.onlyYouSeeList}</p>
          </div>
        </div>
        <ul className="mt-8 flex flex-wrap gap-2 text-sm">
          {chips.map(({ icon: Icon, label }) => (
            <li key={label} className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-2 font-medium text-ink/80">
              <Icon className="h-4 w-4 text-brand" /> {label}
            </li>
          ))}
        </ul>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-5 pb-24">
        <h2 className="text-center font-display text-3xl font-bold tracking-tight sm:text-4xl">{c.faqTitle}</h2>
        <div className="mt-10 space-y-3">
          {faqs.map(([q, a]) => (
            <details key={q} className="card group rounded-2xl px-6 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {q}
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-canvas text-lg leading-none text-brand transition group-open:rotate-45"
                  aria-hidden
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink/65">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Closing call */}
      <section className="px-5 pb-24">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[32px] bg-gradient-to-br from-brand via-[#7B3FE4] to-[#B62AD9] px-8 py-16 text-center text-white shadow-lift">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
          <h2 className="relative mx-auto max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-5xl">{c.ctaTitle}</h2>
          <p className="relative mt-4 text-white/80">{c.ctaBody}</p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand-deep shadow-card transition hover:bg-brand-tint"
            >
              {c.createAccount} <ArrowRight className="h-4 w-4" />
            </Link>
            {demo && (
              <Link
                href="/login?demo=1"
                className="inline-flex items-center rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {c.demo}
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
