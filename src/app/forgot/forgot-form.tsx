"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound } from "lucide-react";
import { useCopy } from "@/components/locale";
import { PublicPage } from "@/components/site/public-page";

function Prefill({ onEmail }: { onEmail: (v: string) => void }) {
  const email = useSearchParams().get("email") || "";
  useEffect(() => {
    if (email) onEmail(email);
  }, [email, onEmail]);
  return null;
}

function Form() {
  const { c, locale } = useCopy();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, intent: "reset", locale }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not send the email. Please try again.");
      return;
    }
    const q = new URLSearchParams({ email, delivery: data.delivery });
    if (data.previewToken) q.set("preview", data.previewToken);
    router.push(`/reset?${q.toString()}`);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-5 py-12 lg:py-20">
      <Suspense>
        <Prefill onEmail={setEmail} />
      </Suspense>
      <div className="card rounded-3xl p-7 sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-tint text-brand">
          <KeyRound className="h-6 w-6" />
        </span>
        <h1 className="mt-5 font-display text-3xl font-bold tracking-tight">{c.forgotTitle}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{c.forgotBody}</p>
        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (email) void send();
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
              autoFocus
              required
            />
          </label>
          {error && (
            <p className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              {error}
            </p>
          )}
          <button className="btn-primary mt-5 w-full !py-3" disabled={busy || !email}>
            {c.sendReset}
          </button>
        </form>
        <p className="mt-5 text-sm">
          <Link href="/login" className="font-medium text-brand hover:underline">
            ← {c.backToSignIn}
          </Link>
        </p>
      </div>
    </div>
  );
}

export function ForgotForm() {
  return (
    <PublicPage>
      <Form />
    </PublicPage>
  );
}
