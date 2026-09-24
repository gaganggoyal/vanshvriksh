"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";
import { useCopy } from "@/components/locale";
import { Letterbox } from "@/components/site/letterbox";
import { PublicPage } from "@/components/site/public-page";
import { fill } from "@/lib/i18n";

const RESEND_AFTER = 30;

function VerifyInner() {
  const { c, locale } = useCopy();
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") || "";
  const intent = params.get("intent") === "signup" ? "signup" : "signin";
  const delivery = params.get("delivery") || "letterbox";
  const nextRaw = params.get("next") || "";
  const next = /^\/(?![\/\\])/.test(nextRaw) ? nextRaw : "/tree";
  const [preview, setPreview] = useState(params.get("preview") || "");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(RESEND_AFTER);
  const [sentCount, setSentCount] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function verify(value: string) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: value }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      setError(data.error || c.invalid);
      return;
    }
    const dest = data.needsOnboarding ? "/onboarding" : next;
    router.push(data.needsPassword ? `/welcome?next=${encodeURIComponent(dest)}` : dest);
  }

  async function resend() {
    setError("");
    setNote("");
    const res = await fetch("/api/auth/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, intent, locale }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not send the email. Please try again.");
      return;
    }
    setNote(c.resent);
    setWait(RESEND_AFTER);
    if (data.previewToken) setPreview(data.previewToken);
    setSentCount((n) => n + 1);
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col px-5 py-12 lg:py-20">
      <div className="card rounded-3xl p-7 sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-tint text-brand">
          <MailCheck className="h-6 w-6" />
        </span>
        <h1 className="mt-5 font-display text-3xl font-bold tracking-tight">{c.checkMail}</h1>
        <p className="mt-2 text-sm text-ink/70">{intent === "signup" ? c.sentSignup : c.sentSignin}</p>
        <p className="mt-1 break-all text-sm font-semibold">{email}</p>
        <p className="mt-3 text-sm text-ink/70">{c.orClickEmail}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code.length === 6) void verify(code);
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
              disabled={busy}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(v);
                // Typed or pasted the sixth digit: no need to press the button.
                if (v.length === 6 && !busy) void verify(v);
              }}
              autoFocus
            />
          </label>
          {error && (
            <p className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              {error}
            </p>
          )}
          {note && !error && (
            <p className="mt-3 rounded-xl bg-grow/10 px-3 py-2 text-sm text-grow" role="status">
              {note}
            </p>
          )}
          <button className="btn-primary mt-5 w-full !py-3" disabled={busy || code.length !== 6}>
            {c.verify}
          </button>
        </form>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
          <button
            type="button"
            className="font-medium text-brand hover:underline disabled:cursor-default disabled:text-muted disabled:no-underline"
            disabled={wait > 0}
            onClick={resend}
          >
            {wait > 0 ? fill(c.resendIn, { s: wait }) : c.resend}
          </button>
          <Link href={intent === "signup" ? "/register" : "/login"} className="text-muted hover:text-ink">
            {c.wrongEmail}
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted">{c.checkSpam}</p>
      </div>

      {delivery === "letterbox" && <Letterbox preview={preview} refresh={sentCount} />}
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
