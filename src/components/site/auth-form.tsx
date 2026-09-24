"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, LogIn, Mail, Sparkles } from "lucide-react";
import { useCopy } from "@/components/locale";
import { PasswordField } from "./password-field";

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
  const { c, locale } = useCopy();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState(false);
  const [next, setNext] = useState("");
  const register = mode === "register";

  /** One email carries a 6-digit code and a one-click button; /verify takes the code. */
  async function requestCode(intent: "signin" | "signup") {
    setBusy(true);
    setError("");
    setHint(false);
    const res = await fetch("/api/auth/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, intent, locale }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not send the email. Please try again.");
      return;
    }
    const q = new URLSearchParams({ email, intent, delivery: data.delivery });
    if (data.previewToken) q.set("preview", data.previewToken);
    if (next) q.set("next", next);
    router.push(`/verify?${q.toString()}`);
  }

  async function signInWithPassword() {
    setBusy(true);
    setError("");
    setHint(false);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Email or password is incorrect.");
      setHint(res.status === 401);
      return;
    }
    router.push(data.needsOnboarding ? "/onboarding" : next || "/tree");
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

  const errorBox = error && (
    <div className="mt-4 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
      <p>{error}</p>
      {hint && <p className="mt-1 text-xs text-danger/80">{c.loginHint}</p>}
    </div>
  );

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
          {register ? (
            <form
              className="mt-6"
              onSubmit={(e) => {
                e.preventDefault();
                if (email) void requestCode("signup");
              }}
            >
              <ol className="mb-6 grid grid-cols-3 gap-2 text-[11px] font-medium text-muted">
                {[c.regStep1, c.regStep2, c.regStep3].map((label, i) => (
                  <li key={label} className="flex flex-col gap-1.5">
                    <span className={`h-1 rounded-full ${i === 0 ? "bg-brand" : "bg-ink/10"}`} />
                    <span className={i === 0 ? "text-ink" : ""}>
                      {i + 1}. {label}
                    </span>
                  </li>
                ))}
              </ol>
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
              {errorBox}
              <button className="btn-primary mt-5 w-full !py-3" disabled={busy || !email}>
                <Mail className="h-4 w-4" /> {c.continueEmail}
              </button>
            </form>
          ) : (
            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (email && password) void signInWithPassword();
              }}
            >
              <label className="block">
                <span className="field-label">{c.email}</span>
                <input
                  className="field !py-3"
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@family.com"
                  required
                />
              </label>
              <PasswordField
                label={c.password}
                value={password}
                onChange={setPassword}
                action={
                  <Link
                    href={`/forgot${email ? `?email=${encodeURIComponent(email)}` : ""}`}
                    className="text-xs font-semibold text-brand hover:underline"
                  >
                    {c.forgotPassword}
                  </Link>
                }
              />
              {errorBox}
              <button className="btn-primary w-full !py-3" disabled={busy || !email || !password}>
                <LogIn className="h-4 w-4" /> {c.signIn}
              </button>
              <div className="flex items-center gap-3 text-xs text-muted">
                <span className="h-px flex-1 bg-ink/10" />
                {c.orWord}
                <span className="h-px flex-1 bg-ink/10" />
              </div>
              <button
                type="button"
                className="btn-ghost w-full !py-3"
                disabled={busy || !email}
                onClick={() => requestCode("signin")}
              >
                <Mail className="h-4 w-4" /> {c.emailCodeInstead}
              </button>
            </form>
          )}
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
