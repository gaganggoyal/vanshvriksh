"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/logo";
import { LangSwitch, LocaleProvider, useCopy } from "@/components/locale";

/**
 * Only this leaf reads the query string, so the rest of the page is still
 * server-rendered instead of bailing out to the client.
 */
function QueryError({ onError, onNext }: { onError: (msg: string) => void; onNext: (path: string) => void }) {
  const { c } = useCopy();
  const params = useSearchParams();
  const flagged = params.get("error");
  const next = params.get("next");
  useEffect(() => {
    if (flagged) onError(c.invalid);
  }, [flagged, c.invalid, onError]);
  useEffect(() => {
    // Only same-site paths; never an absolute or protocol-relative URL.
    if (next && /^\/(?![\/\\])/.test(next)) onNext(next);
  }, [next, onNext]);
  return null;
}

function LoginInner() {
  const { c } = useCopy();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [next, setNext] = useState("");

  async function send(method: "otp" | "link" | "both") {
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, method }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not send.");
      return;
    }
    const q = new URLSearchParams({
      email,
      sent: method,
      delivery: data.delivery,
    });
    if (next) q.set("next", next);
    if (data.previewToken) q.set("preview", data.previewToken);
    router.push(`/verify?${q.toString()}`);
  }

  async function demo(who: "priya" | "arjun" | "mahesh") {
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
    <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
      <Suspense>
        <QueryError onError={setError} onNext={setNext} />
      </Suspense>
      <div className="flex items-center justify-between">
        <Link href="/">
          <Logo />
        </Link>
        <LangSwitch />
      </div>
      <div className="card-paper mt-10 rounded-3xl p-7">
        <h1 className="font-display text-3xl text-maroon">{c.signIn}</h1>
        <p className="mt-2 text-sm text-ink/70">
          Email a one-time code, or a link you can tap. No password is stored.
        </p>
        <label className="mt-6 block">
          <span className="field-label">{c.email}</span>
          <input
            className="field"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@family.com"
          />
        </label>
        {error && <p className="mt-3 text-sm text-terracotta">{error}</p>}
        <div className="mt-5 flex flex-col gap-2">
          <button className="btn-primary" disabled={busy || !email} onClick={() => send("otp")}>
            {c.sendCode}
          </button>
          <button className="btn-ghost" disabled={busy || !email} onClick={() => send("link")}>
            {c.sendLink}
          </button>
          <button className="btn-ghost" disabled={busy || !email} onClick={() => send("both")}>
            {c.both}
          </button>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-dashed border-gold/40 p-6">
        <p className="font-display text-lg text-maroon">{c.demo}</p>
        <p className="mt-1 text-xs leading-relaxed text-ink/65">{c.demoHint}</p>
        <div className="mt-4 flex flex-col gap-2">
          <button className="btn-ghost" disabled={busy} onClick={() => demo("priya")}>
            {c.demoPriya}
          </button>
          <button className="btn-ghost" disabled={busy} onClick={() => demo("arjun")}>
            {c.demoArjun}
          </button>
          <button className="btn-ghost" disabled={busy} onClick={() => demo("mahesh")}>
            {c.demoMahesh}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <LocaleProvider>
      <LoginInner />
    </LocaleProvider>
  );
}
