"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { t, type Locale } from "@/lib/i18n";

const Ctx = createContext<{
  locale: Locale;
  setLocale: (l: Locale) => void;
  c: ReturnType<typeof t>;
} | null>(null);

export function LocaleProvider({
  initial = "en",
  children,
}: {
  initial?: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocale] = useState<Locale>(initial);
  // Screen readers pick their voice from <html lang>; CSS uses it to keep Devanagari unspaced.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const value = useMemo(() => ({ locale, setLocale, c: t(locale) }), [locale]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCopy() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("LocaleProvider missing");
  return ctx;
}

export function LangSwitch() {
  const { locale, setLocale } = useCopy();
  const opt = (value: Locale, label: string, extra = "") => (
    <button
      type="button"
      aria-pressed={locale === value}
      onClick={() => setLocale(value)}
      className={`rounded-md px-2.5 py-1 transition ${extra} ${locale === value ? "bg-white text-ink shadow-sm" : "text-ink/55 hover:text-ink"}`}
    >
      {label}
    </button>
  );
  return (
    <div className="inline-flex rounded-lg bg-ink/[0.06] p-0.5 text-xs font-semibold" role="group" aria-label="Language">
      {opt("en", "EN")}
      {opt("hi", "हिं", "font-devanagari")}
    </div>
  );
}
