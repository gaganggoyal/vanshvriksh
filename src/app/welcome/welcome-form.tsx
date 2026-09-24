"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, LockKeyhole } from "lucide-react";
import { Logo } from "@/components/logo";
import { LangSwitch, LocaleProvider, useCopy } from "@/components/locale";
import { PasswordField } from "@/components/site/password-field";

const safeNext = (v: string | null) => (v && /^\/(?![\/\\])/.test(v) ? v : "");

/** Step two of sign-up: the email is confirmed, now an optional password. */
function Inner() {
  const { c } = useCopy();
  const router = useRouter();
  const asked = safeNext(useSearchParams().get("next"));
  const [next, setNext] = useState(asked || "/onboarding");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { user: { hasPassword: boolean; hasTree: boolean } | null }) => {
        if (!d.user) return router.replace("/login");
        const dest = asked || (d.user.hasTree ? "/tree" : "/onboarding");
        setNext(dest);
        if (d.user.hasPassword) router.replace(dest);
      });
  }, [asked, router]);

  async function save() {
    if (password !== confirm) {
      setError(c.passwordMismatch);
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not save the password.");
      return;
    }
    router.push(next);
  }

  return (
    <div className="relative z-10 mx-auto max-w-lg px-5 py-8">
      <div className="flex items-center justify-between">
        <Logo />
        <LangSwitch />
      </div>
      <ol className="mt-8 grid grid-cols-3 gap-2 text-[11px] font-medium text-muted">
        {[c.emailConfirmed, c.regStep2, c.regStep3].map((label, i) => (
          <li key={label} className="flex flex-col gap-1.5">
            <span className={`h-1 rounded-full ${i === 0 ? "bg-grow" : i === 1 ? "bg-brand" : "bg-ink/10"}`} />
            <span className={`flex items-center gap-1 ${i === 0 ? "text-grow" : i === 1 ? "text-ink" : ""}`}>
              {i === 0 ? <Check className="h-3 w-3" /> : `${i + 1}.`} {label}
            </span>
          </li>
        ))}
      </ol>
      <div className="card mt-5 rounded-3xl p-7 sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-tint text-brand">
          <LockKeyhole className="h-6 w-6" />
        </span>
        <h1 className="mt-5 font-display text-3xl font-bold tracking-tight text-ink">{c.welcomeTitle}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{c.welcomeBody}</p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (password && confirm) void save();
          }}
        >
          <PasswordField label={c.password} value={password} onChange={setPassword} autoComplete="new-password" meter autoFocus />
          <PasswordField label={c.passwordConfirm} value={confirm} onChange={setConfirm} autoComplete="new-password" />
          {error && (
            <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              {error}
            </p>
          )}
          <button className="btn-primary w-full !py-3" disabled={busy || password.length < 8 || !confirm}>
            {c.savePassword}
          </button>
        </form>
        <button type="button" className="mt-4 w-full text-center text-sm text-muted hover:text-ink" onClick={() => router.push(next)}>
          {c.skipForNow}
        </button>
      </div>
    </div>
  );
}

export function WelcomeForm() {
  return (
    <LocaleProvider>
      <Suspense>
        <Inner />
      </Suspense>
    </LocaleProvider>
  );
}
