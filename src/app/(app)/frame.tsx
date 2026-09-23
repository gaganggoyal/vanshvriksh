"use client";

import { LocaleProvider } from "@/components/locale";
import { AppShell } from "@/components/shell";
import type { Locale } from "@/lib/i18n";

export function AppFrame({
  locale,
  pending,
  email,
  children,
}: {
  locale: Locale;
  pending: number;
  email: string;
  children: React.ReactNode;
}) {
  return (
    <LocaleProvider initial={locale}>
      <AppShell pending={pending} email={email}>
        {children}
      </AppShell>
    </LocaleProvider>
  );
}
