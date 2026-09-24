"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, MailX } from "lucide-react";
import { useCopy } from "@/components/locale";
import { Letterbox } from "@/components/site/letterbox";
import { PasswordField } from "@/components/site/password-field";
import { PublicPage } from "@/components/site/public-page";
import { fill } from "@/lib/i18n";

/**
 * Two ways here: the emailed button (?token=…, no code to type) or the
 * forgot-password form (?email=…, type the 6-digit code from the letter).
 */
function Form() {
  const { c, locale } = useCopy();
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const email = params.get("email") || "";
  const delivery = params.get("delivery") || "";
  const [preview, setPreview] = useState(params.get("preview") || "");
  const [masked, setMasked] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  useEffect(() => {
    if (!token) return;
    void fetch("/api/auth/reset/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => ({})) }))
      .then(({ ok, data }) => (ok ? setMasked(data.email) : setInvalid(true)));
  }, [token]);

  async function save() {
    if (password !== confirm) {
      setError(c.passwordMismatch);
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(token ? { token, password } : { email, code, password }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || c.resetInvalid);
      return;
    }
    router.push(data.needsOnboarding ? "/onboarding" : "/tree");
  }

  async function resend() {
    setError("");
    const res = await fetch("/api/auth/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, intent: "reset", locale }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not send the email. Please try again.");
      return;
    }
    setNote(c.resent);
    if (data.previewToken) setPreview(data.previewToken);
    setSentCount((n) => n + 1);
  }

  if ((token && invalid) || (!token && !email)) {
    return (
      <div className="card rounded-3xl p-8 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-danger/10 text-danger">
          <MailX className="h-6 w-6" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">{c.resetInvalid}</h1>
        <Link href="/forgot" className="btn-primary mt-6">
          {c.requestNew}
        </Link>
      </div>
    );
  }

  const ready = password.length >= 8 && confirm.length > 0 && (token ? masked !== null : code.length === 6);
  return (
    <>
      <div className="card rounded-3xl p-7 sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-tint text-brand">
          <KeyRound className="h-6 w-6" />
        </span>
        <h1 className="mt-5 font-display text-3xl font-bold tracking-tight">{c.resetTitle}</h1>
        <p className="mt-2 break-words text-sm leading-relaxed text-muted">
          {token ? (masked ? fill(c.resetFor, { email: masked }) : "…") : fill(c.resetSentTo, { email })}
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (ready) void save();
          }}
        >
          {!token && (
            <label className="block">
              <span className="field-label">{c.code}</span>
              <input
                className="field !py-3 text-center font-display !text-xl font-bold tracking-[0.45em]"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoFocus
              />
            </label>
          )}
          <PasswordField label={c.passwordNew} value={password} onChange={setPassword} autoComplete="new-password" meter autoFocus={Boolean(token)} />
          <PasswordField label={c.passwordConfirm} value={confirm} onChange={setConfirm} autoComplete="new-password" />
          {error && (
            <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              {error}
            </p>
          )}
          {note && !error && (
            <p className="rounded-xl bg-grow/10 px-3 py-2 text-sm text-grow" role="status">
              {note}
            </p>
          )}
          <button className="btn-primary w-full !py-3" disabled={busy || !ready}>
            {c.resetSave}
          </button>
        </form>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
          {!token && (
            <button type="button" className="font-medium text-brand hover:underline" onClick={resend}>
              {c.resend}
            </button>
          )}
          <Link href="/login" className="text-muted hover:text-ink">
            {c.backToSignIn}
          </Link>
        </div>
        {!token && <p className="mt-4 text-xs text-muted">{c.checkSpam}</p>}
      </div>
      {delivery === "letterbox" && <Letterbox preview={preview} refresh={sentCount} />}
    </>
  );
}

export function ResetForm() {
  return (
    <PublicPage>
      <div className="mx-auto flex max-w-md flex-col px-5 py-12 lg:py-20">
        <Suspense>
          <Form />
        </Suspense>
      </div>
    </PublicPage>
  );
}
