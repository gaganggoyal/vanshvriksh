"use client";

import { useEffect, useState } from "react";
import { useCopy } from "@/components/locale";

/** Local development only: shows the letters that would have been emailed. */
export function Letterbox({ preview, refresh = 0 }: { preview: string; refresh?: number }) {
  const { c } = useCopy();
  const [letters, setLetters] = useState<{ subject: string; html: string }[]>([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!preview) return;
    void fetch(`/api/auth/letterbox?token=${preview}`)
      .then((r) => (r.ok ? r.json() : { emails: [] }))
      .then((d) => setLetters(d.emails || []));
  }, [preview, refresh]);

  if (!preview) return null;
  return (
    <div className="mt-6">
      <button className="btn-ghost" onClick={() => setOpen((v) => !v)}>
        {c.letterbox}
      </button>
      {open && (
        <div className="mt-4 space-y-4">
          {letters.map((l, i) => (
            <article key={i} className="overflow-hidden rounded-2xl border border-line/30 bg-surface">
              <div className="border-b border-line/20 px-4 py-2 text-xs text-muted">{l.subject}</div>
              <iframe title={l.subject} srcDoc={l.html} className="h-[560px] w-full" sandbox="allow-popups allow-top-navigation-by-user-activation" />
            </article>
          ))}
          {!letters.length && <p className="text-sm text-ink/60">The letterbox is empty.</p>}
        </div>
      )}
    </div>
  );
}
