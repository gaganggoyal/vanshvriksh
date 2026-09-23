"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { LangSwitch, useCopy } from "@/components/locale";
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

const DIGITS = ["१", "२", "३", "४"];

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

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="font-display text-3xl text-maroon sm:text-4xl">{value.toLocaleString("en-IN")}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.2em] text-gold-dim">{label}</div>
    </div>
  );
}

export function Landing({ stats, demo }: { stats: Stats; demo: boolean }) {
  const { c } = useCopy();
  const [q, setQ] = useState("");
  const { result, loading } = useTeaser(q);
  const findHref = `/login?next=${encodeURIComponent(`/find?q=${q.trim()}`)}`;

  return (
    <div className="relative z-10">
      <header className="sticky top-0 z-30 border-b border-gold/20 bg-cream/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <Link href="/" aria-label="वंश वृक्ष — home">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-maroon md:flex" aria-label="Sections">
            <a href="#how" className="hover:text-maroon-deep">{c.navHow}</a>
            <a href="#privacy" className="hover:text-maroon-deep">{c.navPrivacy}</a>
            <a href="#faq" className="hover:text-maroon-deep">{c.navFaq}</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <LangSwitch />
            <Link href="/login" className="btn-ghost hidden !px-4 !py-2 sm:inline-flex">
              {c.signIn}
            </Link>
            <Link href="/login" className="btn-primary !px-4 !py-2">
              {c.begin}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-14 pt-10 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
        <div>
          <p className="keep-tracking text-xs uppercase tracking-[0.35em] text-gold-dim">
            Family · <span className="font-devanagari normal-case">वंश</span> · lineage
          </p>
          <h1 className="mt-4 font-display text-4xl leading-[1.08] text-maroon sm:text-5xl lg:text-[3.6rem]">{c.heroTitle}</h1>
          <p className="mt-3 font-devanagari text-lg text-maroon-soft">{c.taglineHi === c.tagline ? "" : c.taglineHi}</p>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink/75">{c.heroBody}</p>

          <div className="card-paper mt-8 max-w-xl rounded-3xl p-4 sm:p-5">
            <label htmlFor="teaser" className="field-label">
              {c.teaserLabel}
            </label>
            <div className="flex gap-2">
              <input
                id="teaser"
                className="field !py-3 !text-base"
                placeholder={c.teaserPlaceholder}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && q.trim()) window.location.href = findHref;
                }}
                autoComplete="off"
              />
            </div>
            <div className="min-h-[3.25rem] pt-3 text-sm" aria-live="polite">
              {loading && <span className="text-gold-dim">…</span>}
              {!loading && result && result.people > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-ink/80">
                    {fill(result.families === 1 ? c.teaserResultOne : c.teaserResult, { people: result.people, families: result.families })}
                    {result.places.length > 0 && (
                      <span className="text-gold-dim">
                        {" "}
                        {c.teaserPlaces} {result.places.join(", ")}.
                      </span>
                    )}
                  </p>
                  <Link href={findHref} className="btn-primary !py-2">
                    {c.teaserCta} →
                  </Link>
                </div>
              )}
              {!loading && result && result.people === 0 && <p className="text-ink/60">{c.teaserNone}</p>}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login" className="btn-primary">
              {c.begin}
            </Link>
            {demo && (
              <Link href="/login?demo=1" className="btn-ghost">
                {c.demo}
              </Link>
            )}
          </div>
        </div>

        {/* Product vignette: a real match, as the families would see it */}
        <div className="relative">
          <div className="relative overflow-hidden rounded-[28px] border border-gold/40 shadow-lift">
            <img src="/images/hero.jpg" alt="An old banyan, standing in for a family tree" className="h-[440px] w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-maroon-deep/80 via-maroon-deep/10 to-transparent" />
            <p className="absolute bottom-5 left-5 right-5 font-devanagari text-lg text-paper">एक नाम से वृक्ष शुरू होता है।</p>
          </div>
          <div className="card-paper absolute -left-4 top-8 w-[min(20rem,85%)] rounded-2xl p-4 sm:-left-10" aria-hidden>
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-gold-dim">
              <span>{c.matches}</span>
              <span className="text-leaf">{c.confirmed}</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="font-devanagari text-maroon">हरिशंकर शर्मा</span>
              <span className="text-gold">⇄</span>
              <span>Hari Shankar Sharma</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-gold/30 px-2 py-0.5 text-[10px] text-gold-dim">{c.rs_private_records}</span>
              <span className="rounded-full border border-gold/30 px-2 py-0.5 text-[10px] text-gold-dim">{c.rs_relatives}</span>
            </div>
            <p className="mt-3 rounded-xl bg-leaf/10 px-3 py-2 text-xs text-ink/80">
              Arjun Sharma — <span className="font-devanagari text-base text-maroon">चचेरे बड़े भाई</span>
            </p>
          </div>
          <div className="card-paper absolute -bottom-5 right-3 rounded-2xl px-4 py-3 text-sm sm:right-6" aria-hidden>
            <p className="text-xs text-leaf">+5 · {c.showLinked}</p>
            <p className="mt-1 font-devanagari text-maroon">नाना · नानी · मामा · मामी · ममेरा भाई</p>
          </div>
        </div>
      </section>

      {/* Live numbers */}
      <section className="border-y border-gold/25 bg-paper/60">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-5 py-10 sm:grid-cols-4">
          <Stat value={stats.families} label={c.statsFamilies} />
          <Stat value={stats.people} label={c.statsPeople} />
          <Stat value={stats.remembered} label={c.statsRemembered} />
          <Stat value={stats.linked} label={c.statsLinked} />
        </div>
      </section>

      {/* How relatives are found */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">{c.navHow}</p>
        <h2 className="mt-3 max-w-2xl font-display text-3xl text-maroon sm:text-4xl">{c.howTitle}</h2>
        <ol className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            [c.how1Title, c.how1],
            [c.how2Title, c.how2],
            [c.how3Title, c.how3],
            [c.how4Title, c.how4],
          ].map(([title, body], i) => (
            <li key={title} className="card-paper relative rounded-3xl p-6">
              <span className="font-devanagari text-4xl text-gold" aria-hidden>
                {DIGITS[i]}
              </span>
              <h3 className="mt-3 font-display text-xl text-maroon">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/70">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Kinship */}
      <section className="bg-maroon-deep text-paper">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[1fr_1.3fr] lg:items-center">
          <div>
            <p className="keep-tracking text-xs uppercase tracking-[0.3em] text-gold-light/80">
              <span className="font-devanagari normal-case">रिश्ते</span> · kinship
            </p>
            <h2 className="mt-3 font-display text-3xl text-gold-light sm:text-4xl">{c.kinTitle}</h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-paper/80">{c.kinBody}</p>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {KIN.map(([hi, en]) => (
              <li key={hi} className="rounded-2xl border border-gold/25 bg-paper/5 px-4 py-3">
                <span className="block font-devanagari text-xl text-gold-light">{hi}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-paper/65">{en}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Privacy */}
      <section id="privacy" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
        <p className="text-xs uppercase tracking-[0.3em] text-gold-dim">{c.navPrivacy}</p>
        <h2 className="mt-3 font-display text-3xl text-maroon sm:text-4xl">{c.privacyTitle}</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {[
            [c.privacy1Title, c.privacy1],
            [c.privacy2Title, c.privacy2],
            [c.privacy3Title, c.privacy3],
            [c.privacy4Title, c.privacy4],
          ].map(([title, body]) => (
            <article key={title} className="card-paper rounded-3xl p-6">
              <h3 className="font-display text-xl text-maroon">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/70">{body}</p>
            </article>
          ))}
        </div>
        <div className="mt-6 grid overflow-hidden rounded-3xl border border-gold/35 md:grid-cols-2">
          <div className="bg-paper p-6">
            <p className="field-label">{c.othersSee}</p>
            <p className="text-sm leading-relaxed text-ink/80">{c.othersSeeList}</p>
          </div>
          <div className="border-t border-gold/35 bg-cream-deep/60 p-6 md:border-l md:border-t-0">
            <p className="field-label !text-maroon">{c.onlyYouSee}</p>
            <p className="text-sm leading-relaxed text-ink/80">{c.onlyYouSeeList}</p>
          </div>
        </div>
        <ul className="mt-8 flex flex-wrap gap-2 text-sm text-maroon">
          {[c.featHindi, c.featNoPassword, c.featGedcom, c.featPhone].map((f) => (
            <li key={f} className="rounded-full border border-gold/40 bg-paper px-4 py-2">
              {f}
            </li>
          ))}
        </ul>
      </section>

      <div className="ornament-line mx-auto max-w-5xl" />

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-5 py-20">
        <h2 className="font-display text-3xl text-maroon sm:text-4xl">{c.faqTitle}</h2>
        <div className="mt-8 divide-y divide-gold/25 rounded-3xl border border-gold/30 bg-paper/70">
          {[
            [c.faq1q, c.faq1a],
            [c.faq2q, c.faq2a],
            [c.faq3q, c.faq3a],
            [c.faq4q, c.faq4a],
            [c.faq5q, c.faq5a],
          ].map(([q, a]) => (
            <details key={q} className="group px-6 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink">
                {q}
                <span className="text-gold transition group-open:rotate-45" aria-hidden>
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink/70">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Closing call */}
      <section className="px-5 pb-20">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[32px] bg-maroon px-8 py-14 text-center shadow-lift">
          <p className="font-devanagari text-lg text-gold-light/90">वंश वृक्ष</p>
          <h2 className="mx-auto mt-3 max-w-2xl font-display text-3xl text-paper sm:text-4xl">{c.ctaTitle}</h2>
          <p className="mt-3 text-paper/75">{c.ctaBody}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/login" className="inline-flex items-center rounded-full bg-gold-light px-6 py-3 text-sm font-medium text-maroon-deep transition hover:bg-paper">
              {c.begin}
            </Link>
            {demo && (
              <Link href="/login?demo=1" className="inline-flex items-center rounded-full border border-gold-light/50 px-6 py-3 text-sm text-paper transition hover:bg-paper/10">
                {c.demo}
              </Link>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-gold/25 px-5 py-8 text-center text-xs text-gold-dim">{c.footer}</footer>
    </div>
  );
}
