"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, MailX } from "lucide-react";
import { useCopy } from "@/components/locale";
import { PublicPage } from "@/components/site/public-page";

/**
 * Where the emailed button lands. The token is posted from the page rather
 * than spent by the GET itself, so link-preview bots don't use up the letter.
 */
function MagicInner() {
  const { c } = useCopy();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [failed, setFailed] = useState(false);
  const fired = useRef(false);

  useEffect(() => {
    if (!token || fired.current) return;
    fired.current = true;
    fetch("/api/auth/magic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => ({})) }))
      .then(({ ok, data }) => {
        if (ok && typeof data.redirect === "string" && data.redirect.startsWith("/")) window.location.replace(data.redirect);
        else setFailed(true);
      })
      .catch(() => setFailed(true));
  }, [token]);

  const broken = failed || !token;
  return (
    <div className="mx-auto flex max-w-md flex-col px-5 py-16 lg:py-24">
      <div className="card rounded-3xl p-8 text-center">
        {broken ? (
          <>
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-danger/10 text-danger">
              <MailX className="h-6 w-6" />
            </span>
            <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">{c.linkExpired}</h1>
            <p className="mt-2 text-sm text-muted">{c.invalid}</p>
            <div className="mt-6 flex justify-center gap-2">
              <Link href="/login" className="btn-primary">
                {c.signIn}
              </Link>
              <Link href="/register" className="btn-ghost">
                {c.createAccount}
              </Link>
            </div>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand" />
            <p className="mt-4 font-semibold">{c.signingIn}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function MagicPage() {
  return (
    <PublicPage>
      <Suspense>
        <MagicInner />
      </Suspense>
    </PublicPage>
  );
}
