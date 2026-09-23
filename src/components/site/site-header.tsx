"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { LangSwitch, useCopy } from "@/components/locale";

export function SiteHeader() {
  const { c } = useCopy();
  const path = usePathname();
  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-ink/5 ${path === href ? "text-ink" : "text-ink/65"}`}
    >
      {label}
    </Link>
  );
  return (
    <header className="sticky top-0 z-40 border-b border-ink/[0.06] bg-canvas/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5">
        <Link href="/" aria-label="Mera Vansh — home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {link("/#how", c.navHow)}
          {link("/#privacy", c.navPrivacy)}
          {link("/about", c.navAbout)}
          {link("/#faq", c.navFaq)}
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <LangSwitch />
          <Link href="/login" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-ink/80 hover:bg-ink/5 sm:inline-flex">
            {c.signIn}
          </Link>
          <Link href="/register" className="btn-primary whitespace-nowrap !px-3 !py-2 sm:!px-4">
            {c.createAccount}
          </Link>
        </div>
      </div>
    </header>
  );
}
