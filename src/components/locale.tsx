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
  return (
    <div className="inline-flex rounded-full border border-gold/40 bg-paper/80 p-0.5 text-xs">
      <button
        className={`rounded-full px-3 py-1 ${locale === "en" ? "bg-maroon text-paper" : "text-maroon"}`}
        onClick={() => setLocale("en")}
        type="button"
      >
        EN
      </button>
      <button
        className={`rounded-full px-3 py-1 font-devanagari ${locale === "hi" ? "bg-maroon text-paper" : "text-maroon"}`}
        onClick={() => setLocale("hi")}
        type="button"
      >
        हिं
      </button>
    </div>
  );
}
