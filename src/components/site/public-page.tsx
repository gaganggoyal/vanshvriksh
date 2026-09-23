"use client";

import { LocaleProvider } from "@/components/locale";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

/** Chrome shared by every signed-out page: header, footer, language. */
export function PublicPage({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </LocaleProvider>
  );
}
