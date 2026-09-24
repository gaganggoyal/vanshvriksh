"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BellOff, BellRing } from "lucide-react";
import { useCopy } from "@/components/locale";
import { PublicPage } from "@/components/site/public-page";

/** A person presses the button here; opening the page alone changes nothing. */
function Inner() {
  const { c } = useCopy();
  const token = useSearchParams().get("token") || "";
  const [state, setState] = useState<"ask" | "off" | "on" | "invalid">("ask");
  const [busy, setBusy] = useState(false);

  async function set(on: boolean) {
    setBusy(true);
    const res = await fetch(`/api/unsubscribe?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ on }),
    });
    setBusy(false);
    setState(res.ok ? (on ? "on" : "off") : "invalid");
  }

  const off = state === "off";
  return (
    <div className="card rounded-3xl p-8 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-tint text-brand">
        {state === "on" ? <BellRing className="h-6 w-6" /> : <BellOff className="h-6 w-6" />}
      </span>
      <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">
        {state === "invalid" || !token ? c.unsubInvalid : off ? c.unsubDone : state === "on" ? c.unsubBack : c.unsubTitle}
      </h1>
      {state === "ask" && token && <p className="mt-2 text-sm leading-relaxed text-muted">{c.unsubBody}</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {state === "ask" && token && (
          <button className="btn-primary" disabled={busy} onClick={() => set(false)}>
            {c.unsubButton}
          </button>
        )}
        {off && (
          <button className="btn-ghost" disabled={busy} onClick={() => set(true)}>
            {c.unsubUndo}
          </button>
        )}
        <Link href="/matches" className="btn-ghost">
          {c.matches}
        </Link>
      </div>
    </div>
  );
}

export function UnsubscribeForm() {
  return (
    <PublicPage>
      <div className="mx-auto flex max-w-md flex-col px-5 py-16 lg:py-24">
        <Suspense>
          <Inner />
        </Suspense>
      </div>
    </PublicPage>
  );
}
