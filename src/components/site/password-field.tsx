"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useCopy } from "@/components/locale";

/** 0–3: length does most of the work; mixing kinds of characters helps a little. */
export function passwordStrength(pw: string) {
  if (pw.length < 8) return pw ? 1 : 0;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  if (pw.length >= 14 || (pw.length >= 10 && kinds >= 3)) return 3;
  return pw.length >= 10 || kinds >= 3 ? 2 : 1;
}

export function PasswordField({
  label,
  value,
  onChange,
  autoComplete = "current-password",
  meter = false,
  autoFocus = false,
  action,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: "current-password" | "new-password";
  meter?: boolean;
  autoFocus?: boolean;
  /** Something to sit at the end of the label row, e.g. "Forgot password?". */
  action?: React.ReactNode;
}) {
  const { c } = useCopy();
  const id = useId();
  const [shown, setShown] = useState(false);
  const s = passwordStrength(value);
  const tone = s >= 3 ? "bg-grow" : s === 2 ? "bg-brand" : "bg-danger";
  const word = s >= 3 ? c.passwordStrong : s === 2 ? c.passwordOkay : c.passwordWeak;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="field-label">
          {label}
        </label>
        {action}
      </div>
      <div className="relative">
        <input
          id={id}
          className="field !py-3 !pr-12"
          type={shown ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={autoFocus}
          required
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          className="absolute inset-y-0 right-1.5 my-auto grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink"
          aria-label={shown ? c.hide : c.show}
          aria-pressed={shown}
        >
          {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {meter && (
        <div className="mt-2" aria-live="polite">
          <div className="flex gap-1" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} className={`h-1 flex-1 rounded-full transition ${value && i < s ? tone : "bg-ink/10"}`} />
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted">{value ? `${word} · ${c.passwordHint}` : c.passwordHint}</p>
        </div>
      )}
    </div>
  );
}
