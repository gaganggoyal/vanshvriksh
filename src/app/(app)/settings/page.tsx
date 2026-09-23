"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCopy } from "@/components/locale";
import { kinshipMap } from "@/lib/kinship";
import type { Rel } from "@/lib/graph";

type Mine = { id: string; displayName: string; gender: string; birthYear?: number | null; isRoot: boolean; isLiving: boolean };

export default function SettingsPage() {
  const { c, locale, setLocale } = useCopy();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [discoverable, setDiscoverable] = useState<boolean | null>(null);
  const [people, setPeople] = useState<Mine[]>([]);
  const [rels, setRels] = useState<Rel[]>([]);
  const [rootId, setRootId] = useState<string | null>(null);
  const [invitePersonId, setInvitePersonId] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      void fetch("/api/settings")
        .then((r) => r.json())
        .then((d) => setDiscoverable(d.discoverable ?? true));
      void fetch("/api/tree")
        .then((r) => r.json())
        .then((d) => {
          setPeople(d.people ?? []);
          setRels(d.relationships ?? []);
          setRootId(d.focusId ?? null);
        });
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const kin = useMemo(() => (rootId ? kinshipMap(rootId, people, rels) : new Map()), [rootId, people, rels]);
  const invitable = people.filter((p) => !p.isRoot && p.isLiving);

  async function saveDiscoverable(next: boolean) {
    setDiscoverable(next);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discoverable: next }),
    });
  }

  async function saveLocale(next: "en" | "hi") {
    setLocale(next);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    });
  }

  async function invite() {
    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, personId: invitePersonId || null }),
    });
    const data = await res.json();
    if (!res.ok) {
      setNote(data.error || "Could not invite.");
      return;
    }
    setNote(invitePersonId ? c.inviteSentLinked : c.inviteSent);
    if (data.previewToken) setPreview(data.previewToken);
  }

  async function deleteAccount() {
    if (!confirm(c.deleteAccountConfirm)) return;
    setDeleting(true);
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    });
    setDeleting(false);
    if (res.ok) router.push("/");
  }

  return (
    <div className="relative z-10 mx-auto max-w-2xl px-5 py-8">
      <h1 className="font-display text-3xl text-maroon">{c.settings}</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink/70">{c.settingsPrivacy}</p>

      <section className="card-paper mt-8 rounded-3xl p-6">
        <p className="field-label">{c.language}</p>
        <div className="mt-2 flex gap-2">
          <button className={`btn-ghost ${locale === "en" ? "bg-maroon text-paper" : ""}`} onClick={() => saveLocale("en")}>
            English
          </button>
          <button className={`btn-ghost ${locale === "hi" ? "bg-maroon text-paper" : ""}`} onClick={() => saveLocale("hi")}>
            हिन्दी
          </button>
        </div>
      </section>

      <section className="card-paper mt-6 rounded-3xl p-6">
        <p className="font-display text-xl text-maroon">{c.invite}</p>
        <p className="mt-2 text-sm leading-relaxed text-ink/70">{c.inviteHint}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">{c.email}</span>
            <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block">
            <span className="field-label">{c.invitePerson}</span>
            <select className="field" value={invitePersonId} onChange={(e) => setInvitePersonId(e.target.value)}>
              <option value="">{c.inviteNobody}</option>
              {invitable.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName}
                  {kin.get(p.id) ? ` — ${kin.get(p.id)!.hi}` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button className="btn-primary mt-4" disabled={!email} onClick={invite}>
          {c.invite}
        </button>
        {note && <p className="mt-3 text-sm text-leaf">{note}</p>}
        {preview && (
          <a className="mt-2 inline-block text-sm text-maroon underline" href={`/verify?delivery=letterbox&preview=${preview}&sent=link`}>
            {c.letterbox}
          </a>
        )}
      </section>

      <section className="card-paper mt-6 rounded-3xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-xl text-maroon">{c.discoverTitle}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink/70">{c.discoverHint}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!!discoverable}
            aria-label={c.discoverTitle}
            disabled={discoverable === null}
            onClick={() => saveDiscoverable(!discoverable)}
            className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition ${discoverable ? "bg-leaf" : "bg-gold/40"}`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-paper shadow transition-all ${discoverable ? "left-6" : "left-1"}`}
            />
          </button>
        </div>
        {discoverable !== null && (
          <p className={`mt-3 text-xs ${discoverable ? "text-leaf" : "text-gold-dim"}`}>
            {discoverable ? c.discoverOn : c.discoverOff}
          </p>
        )}
      </section>

      <section className="card-paper mt-6 rounded-3xl p-6">
        <p className="font-display text-xl text-maroon">{c.exportTitle}</p>
        <p className="mt-2 text-sm leading-relaxed text-ink/70">{c.exportHint}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a className="btn-primary" href="/api/export?format=gedcom" download>
            {c.exportGedcom}
          </a>
          <a className="btn-ghost" href="/api/export?format=json" download>
            {c.exportJson}
          </a>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-terracotta/40 p-6">
        <p className="font-display text-xl text-terracotta">{c.dangerTitle}</p>
        <p className="mt-2 text-sm leading-relaxed text-ink/70">{c.dangerHint}</p>
        <button
          className="mt-4 inline-flex items-center rounded-full border border-terracotta px-5 py-2.5 text-sm font-medium text-terracotta transition hover:bg-terracotta hover:text-paper disabled:opacity-50"
          disabled={deleting}
          onClick={deleteAccount}
        >
          {c.deleteAccount}
        </button>
      </section>
    </div>
  );
}
