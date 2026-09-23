import Link from "next/link";

/** Long-form legal text: readable measure, a contents list, anchored sections. */
export function Legal({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: React.ReactNode;
  sections: { id: string; title: string; body: React.ReactNode }[];
}) {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
      <div className="max-w-3xl">
        <span className="eyebrow">Legal</span>
        <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-muted">Last updated {updated}</p>
        <div className="mt-8 text-lg leading-relaxed text-ink/75">{intro}</div>
      </div>
      <div className="mt-12 grid gap-12 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Contents" className="hidden lg:block">
          <ol className="sticky top-24 space-y-2 text-sm">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-muted transition hover:text-ink">
                  {i + 1}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="max-w-3xl space-y-12">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="font-display text-2xl font-bold tracking-tight">
                {i + 1}. {s.title}
              </h2>
              <div className="legal-body mt-4 space-y-4 leading-relaxed text-ink/75">{s.body}</div>
            </section>
          ))}
          <p className="border-t border-ink/[0.08] pt-8 text-sm text-muted">
            See also: <Link href="/privacy" className="font-medium text-brand hover:underline">Privacy policy</Link> ·{" "}
            <Link href="/terms" className="font-medium text-brand hover:underline">Terms of service</Link> ·{" "}
            <Link href="/about" className="font-medium text-brand hover:underline">About us</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
