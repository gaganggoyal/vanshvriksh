"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";
import { useCopy } from "@/components/locale";
import { PublicPage } from "@/components/site/public-page";

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
    <div className="mx-auto flex max-w-lg flex-col px-5 py-12 lg:py-20">
      <div className="card rounded-3xl p-7 sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-tint text-brand">
          <MailCheck className="h-6 w-6" />
        </span>
        <h1 className="mt-5 font-display text-3xl font-bold tracking-tight">{c.checkMail}</h1>
        <p className="mt-2 text-sm text-ink/70">{msg}</p>
        <p className="mt-1 text-sm font-semibold">{email}</p>
        {sent !== "link" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (code.length === 6) void verify();
            }}
          >
            <label className="mt-6 block">
              <span className="field-label">{c.code}</span>
              <input
                className="field !py-3.5 text-center font-display !text-2xl font-bold tracking-[0.5em]"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoFocus
              />
            </label>
            {error && (
              <p className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
                {error}
              </p>
            )}
            <button className="btn-primary mt-5 w-full !py-3" disabled={code.length !== 6}>
              {c.verify}
            </button>
          </form>
        )}
        <p className="mt-5 text-xs text-muted">
          <Link href="/login" className="font-medium text-brand hover:underline">
            ← {c.signIn}
          </Link>
        </p>
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
                <article key={i} className="overflow-hidden rounded-2xl border border-line/30 bg-surface">
                  <div className="border-b border-line/20 px-4 py-2 text-xs text-muted">{l.subject}</div>
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
    <PublicPage>
      <Suspense>
        <VerifyInner />
      </Suspense>
    </PublicPage>
  );
}
