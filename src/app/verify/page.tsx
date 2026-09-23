"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/logo";
import { LangSwitch, LocaleProvider, useCopy } from "@/components/locale";

function VerifyInner() {
  const { c } = useCopy();
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") || "";
  const sent = params.get("sent") || "otp";
  const delivery = params.get("delivery") || "letterbox";
  const preview = params.get("preview") || "";
  const nextRaw = params.get("next") || "";
  const next = /^\/(?![\/\\])/.test(nextRaw) ? nextRaw : "/tree";
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [letters, setLetters] = useState<{ subject: string; html: string; text: string }[]>([]);
  const [open, setOpen] = useState(delivery === "letterbox");

  useEffect(() => {
    if (!preview) return;
    fetch(`/api/auth/letterbox?token=${preview}`)
      .then((r) => r.json())
      .then((d) => setLetters(d.emails || []));
  }, [preview]);

  const msg = sent === "link" ? c.sentLink : sent === "both" ? c.sentBoth : c.sentCode;

  async function verify() {
    setError("");
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || c.invalid);
      return;
    }
    router.push(data.needsOnboarding ? "/onboarding" : next);
  }

  return (
    <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col px-5 py-8">
      <div className="flex items-center justify-between">
        <Link href="/">
          <Logo />
        </Link>
        <LangSwitch />
      </div>
      <div className="card-paper mt-10 rounded-3xl p-7">
        <h1 className="font-display text-3xl text-maroon">{c.checkMail}</h1>
        <p className="mt-2 text-sm text-ink/70">{msg}</p>
        <p className="mt-1 text-sm text-gold-dim">{email}</p>
        {sent !== "link" && (
          <>
            <label className="mt-6 block">
              <span className="field-label">{c.code}</span>
              <input
                className="field tracking-[0.4em]"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </label>
            {error && <p className="mt-3 text-sm text-terracotta">{error}</p>}
            <button className="btn-primary mt-5 w-full" disabled={code.length !== 6} onClick={verify}>
              {c.verify}
            </button>
          </>
        )}
        {sent === "link" && (
          <p className="mt-4 text-sm text-ink/70">Open the link in your letter. It can be used once.</p>
        )}
      </div>

      {delivery === "letterbox" && (
        <div className="mt-6">
          <button className="btn-ghost" onClick={() => setOpen((v) => !v)}>
            {c.letterbox}
          </button>
          {open && (
            <div className="mt-4 space-y-4">
              {letters.map((l, i) => (
                <article key={i} className="overflow-hidden rounded-2xl border border-gold/30 bg-paper">
                  <div className="border-b border-gold/20 px-4 py-2 text-xs text-gold-dim">{l.subject}</div>
                  <div className="max-h-80 overflow-auto p-2" dangerouslySetInnerHTML={{ __html: l.html }} />
                </article>
              ))}
              {!letters.length && (
                <p className="text-sm text-ink/60">The letterbox is empty. Request a code again.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <LocaleProvider>
      <Suspense>
        <VerifyInner />
      </Suspense>
    </LocaleProvider>
  );
}
