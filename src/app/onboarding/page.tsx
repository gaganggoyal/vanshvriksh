"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { LangSwitch, LocaleProvider, useCopy } from "@/components/locale";
import { emptyPerson, PersonForm } from "@/components/person-form";
import { fill } from "@/lib/i18n";

type Invite = {
  inviter: string;
  hi: string;
  en: string;
  prefill: {
    givenName: string;
    familyName: string;
    nativeName: string;
    alsoKnownAs: string;
    gender: string;
    village: string;
    gotra: string;
  };
};

function OnboardInner() {
  const { c, locale } = useCopy();
  const router = useRouter();
  const [value, setValue] = useState(emptyPerson());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [linkInvite, setLinkInvite] = useState(true);

  // Joining by invitation: start from what the inviting family already wrote.
  useEffect(() => {
    let live = true;
    void fetch("/api/onboarding")
      .then((r) => (r.ok ? r.json() : { invite: null }))
      .then((d: { invite: Invite | null }) => {
        if (!live || !d.invite) return;
        setInvite(d.invite);
        setValue((v) => ({ ...v, ...d.invite!.prefill }));
      });
    return () => {
      live = false;
    };
  }, []);

  async function submit() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...value, birthDate: value.birthDate || null, locale, linkInvite }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not start the tree.");
      return;
    }
    router.push(data.linked ? "/tree?linked=1" : "/tree");
  }

  return (
    <div className="relative z-10 mx-auto max-w-2xl px-5 py-8">
      <div className="flex items-center justify-between">
        <Logo />
        <LangSwitch />
      </div>
      <div className="card-paper mt-8 rounded-3xl p-7">
        <h1 className="font-display text-3xl text-maroon">{c.onboardingTitle}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink/70">{c.onboardingHint}</p>
        {invite && (
          <div className="mt-5 rounded-2xl border border-leaf/30 bg-leaf/5 p-4 text-sm leading-relaxed">
            <p>
              {invite.hi
                ? fill(c.invitedBanner, { inviter: invite.inviter, term: invite.hi })
                : fill(c.invitedBannerPlain, { inviter: invite.inviter })}
            </p>
            <label className="mt-3 flex items-center gap-2 font-medium text-leaf">
              <input type="checkbox" className="accent-leaf" checked={linkInvite} onChange={(e) => setLinkInvite(e.target.checked)} />
              {fill(c.linkInvite, { inviter: invite.inviter })}
            </label>
          </div>
        )}
        <div className="mt-6">
          <PersonForm locale={locale} value={value} onChange={setValue} extra />
        </div>
        {error && <p className="mt-3 text-sm text-terracotta">{error}</p>}
        <button className="btn-primary mt-6" disabled={busy || !value.givenName} onClick={submit}>
          {c.continue}
        </button>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <LocaleProvider>
      <OnboardInner />
    </LocaleProvider>
  );
}
