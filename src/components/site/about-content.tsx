"use client";

import Link from "next/link";
import { ArrowRight, Download, Languages, Lock, Mail } from "lucide-react";
import { useCopy } from "@/components/locale";
import { BRAND } from "@/lib/brand";

const TEAM = [
  { name: "Gagan", nameHi: "गगन", role: "founder" as const, initial: "G", tone: "from-brand to-[#B62AD9]" },
  { name: "Vansh", nameHi: "वंश", role: "cofounder" as const, initial: "V", tone: "from-emerald-500 to-teal-500" },
];

export function AboutContent() {
  const { c } = useCopy();
  const values = [
    { icon: Lock, title: c.value1Title, body: c.value1 },
    { icon: Languages, title: c.value2Title, body: c.value2 },
    { icon: Download, title: c.value3Title, body: c.value3 },
  ];
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 -top-24 -z-10 h-[420px] bg-[radial-gradient(50%_60%_at_30%_20%,rgba(91,75,245,0.14),transparent)]" />
      <section className="mx-auto max-w-3xl px-5 pb-16 pt-16 sm:pt-24">
        <span className="eyebrow">{c.aboutKicker}</span>
        <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">{c.aboutTitle}</h1>
        <p className="mt-8 text-lg leading-relaxed text-ink/70">{c.aboutBody1}</p>
        <p className="mt-5 text-lg leading-relaxed text-ink/70">{c.aboutBody2}</p>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-20">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{c.teamTitle}</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {TEAM.map((m) => (
            <article key={m.name} className="card flex items-center gap-5 rounded-3xl p-6">
              <span
                className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${m.tone} font-display text-2xl font-bold text-white shadow-glow`}
                aria-hidden
              >
                {m.initial}
              </span>
              <div>
                <p className="font-display text-2xl font-bold tracking-tight">
                  {m.name} <span className="font-devanagari text-lg font-medium text-muted">{m.nameHi}</span>
                </p>
                <p className="mt-1 inline-flex rounded-full bg-brand-tint px-3 py-0.5 text-sm font-semibold text-brand">
                  {m.role === "founder" ? c.founder : c.cofounder}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-ink/[0.06] bg-white">
        <div className="mx-auto max-w-5xl px-5 py-20">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{c.valuesTitle}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {values.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-3xl bg-canvas p-6">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-brand shadow-sm">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-bold tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/65">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20">
        <div className="card flex flex-col items-start justify-between gap-6 rounded-3xl p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">{c.contactTitle}</h2>
            <p className="mt-1 text-ink/65">{c.contactBody}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={`mailto:${BRAND.contact}`} className="btn-ghost">
              <Mail className="h-4 w-4" /> {BRAND.contact}
            </a>
            <Link href="/register" className="btn-primary">
              {c.createAccount} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
