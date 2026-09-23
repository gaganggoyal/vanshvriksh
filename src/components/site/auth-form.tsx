"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, Link2, Mail, Sparkles } from "lucide-react";
import { useCopy } from "@/components/locale";

type Mode = "signin" | "register";

/** Same-site paths only; never an absolute or protocol-relative URL. */
const safeNext = (v: string | null) => (v && /^\/(?![\/\\])/.test(v) ? v : "");

/** Only this leaf reads the query string, so the rest of the page server-renders. */
function QueryState({ onError, onNext }: { onError: (msg: string) => void; onNext: (path: string) => void }) {
  const { c } = useCopy();
  const params = useSearchParams();
  const flagged = params.get("error");
  const next = safeNext(params.get("next"));
  useEffect(() => {
    if (flagged) onError(c.invalid);
  }, [flagged, c.invalid, onError]);
  useEffect(() => {
    if (next) onNext(next);
  }, [next, onNext]);
  return null;
}

export function AuthForm({ mode, demo }: { mode: Mode; demo: boolean }) {
  const { c } = useCopy();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [next, setNext] = useState("");
  const register = mode === "register";

  async function send(method: "otp" | "link") {
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, method, intent: mode }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not send the email. Please try again.");
      return;
    }
    const q = new URLSearchParams({ email, sent: method, delivery: data.delivery });
    if (data.previewToken) q.set("preview", data.previewToken);
    if (next) q.set("next", next);
    router.push(`/verify?${q.toString()}`);
  }

  async function tryDemo(who: "priya" | "arjun" | "mahesh") {
    setBusy(true);
    const res = await fetch("/api/auth/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ who }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Demo unavailable.");
      return;
    }
    router.push(data.needsOnboarding ? "/onboarding" : next || "/tree");
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:py-20">
      <Suspense>
        <QueryState onError={setError} onNext={setNext} />
      </Suspense>

      <div className="hidden lg:block">
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-brand via-[#7B3FE4] to-[#B62AD9] p-10 text-white shadow-lift">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <Sparkles className="h-7 w-7 text-brand-light" />
          <h2 className="mt-6 font-display text-4xl font-bold leading-tight tracking-tight">{c.heroTitle}</h2>
          <ul className="mt-8 space-y-4">
            {[c.perk1, c.perk2, c.perk3].map((p) => (
              <li key={p} className="flex items-start gap-3 text-white/90">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/20">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {p}
              </li>
            ))}
          </ul>
          <p className="mt-10 font-devanagari text-lg text-white/80">{c.taglineHi}</p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md">
        <div className="card rounded-3xl p-7 sm:p-8">
          <h1 className="font-display text-3xl font-bold tracking-tight">{register ? c.registerTitle : c.signInTitle}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">{register ? c.registerBody : c.signInBody}</p>
          <form
            className="mt-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (email) void send("otp");
            }}
          >
            <label className="block">
              <span className="field-label">{c.email}</span>
              <input
                className="field !py-3"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@family.com"
                required
              />
            </label>
            {error && (
              <p className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
                {error}
              </p>
            )}
            <div className="mt-5 flex flex-col gap-2">
              <button className="btn-primary !py-3" disabled={busy || !email}>
                <Mail className="h-4 w-4" /> {c.sendCode}
              </button>
              <button type="button" className="btn-ghost !py-3" disabled={busy || !email} onClick={() => send("link")}>
                <Link2 className="h-4 w-4" /> {c.sendLink}
              </button>
            </div>
          </form>
          <p className="mt-5 text-xs leading-relaxed text-muted">
            {c.agreePrefix}{" "}
            <Link href="/terms" className="font-medium text-ink underline underline-offset-2">
              {c.navTerms}
            </Link>{" "}
            {c.and}{" "}
            <Link href="/privacy" className="font-medium text-ink underline underline-offset-2">
              {c.navPrivacyPolicy}
            </Link>
            .
          </p>
          <div className="mt-6 border-t border-ink/[0.06] pt-5 text-sm">
            {register ? (
              <p className="text-muted">
                {c.haveAccount}{" "}
                <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand hover:underline">
                  {c.signIn}
                </Link>
              </p>
            ) : (
              <p className="text-muted">
                {c.newHere}{" "}
                <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand hover:underline">
                  {c.createAccount}
                </Link>
              </p>
            )}
          </div>
        </div>

        {demo && (
          <div className="mt-5 rounded-3xl border border-dashed border-ink/15 bg-white/60 p-6">
            <p className="font-semibold">{c.orDemo}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{c.demoHint}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))]">
              {(
                [
                  ["priya", "Priya Sharma", c.demoPriya],
                  ["arjun", "Arjun Sharma", c.demoArjun],
                  ["mahesh", "Mahesh Tiwari", c.demoMahesh],
                ] as const
              ).map(([who, name, label]) => (
                <button
                  key={who}
                  aria-label={label}
                  className="btn-ghost !justify-between !gap-1 whitespace-nowrap !px-3 !py-2 !text-xs"
                  disabled={busy}
                  onClick={() => tryDemo(who)}
                >
                  {name}
                  <ArrowRight className="h-3.5 w-3.5 text-muted" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
