"use client";

import { useState } from "react";
import { useCopy } from "@/components/locale";
import { fill } from "@/lib/i18n";

/** Invite a living person in your tree; their tree links to yours when they join. */
export function InviteInline({ personId, name }: { personId: string; name: string }) {
  const { c } = useCopy();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, personId }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setNote(data.error || "Could not invite.");
      return;
    }
    setNote(c.inviteSentLinked);
    setPreview(data.previewToken ?? "");
    setOpen(false);
    setEmail("");
  }

  return (
    <div className="mt-3">
      {!open && (
        <button type="button" className="text-sm text-maroon underline underline-offset-4" onClick={() => setOpen(true)}>
          ✉ {fill(c.inviteThem, { name })}
        </button>
      )}
      {open && (
        <div className="flex gap-2">
          <input
            className="field"
            type="email"
            placeholder={c.inviteEmail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label={c.inviteEmail}
            autoFocus
          />
          <button className="btn-primary shrink-0 !px-4" disabled={busy || !email} onClick={send}>
            {c.inviteSend}
          </button>
        </div>
      )}
      {note && <p className="mt-2 text-xs text-leaf">{note}</p>}
      {preview && (
        <a className="text-xs text-maroon underline" href={`/verify?delivery=letterbox&preview=${preview}&sent=link`}>
          {c.letterbox}
        </a>
      )}
    </div>
  );
}
