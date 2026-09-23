"use client";

import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { useCopy } from "@/components/locale";
import { BRAND } from "@/lib/brand";

export function SiteFooter() {
  const { c } = useCopy();
  const col = (title: string, links: [string, string][]) => (
    <div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="text-sm text-muted transition hover:text-ink">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <footer className="border-t border-ink/[0.06] bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <LogoMark size={32} />
            <span className="font-display text-lg font-bold tracking-tight">{BRAND.name}</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">{c.footer}</p>
        </div>
        {col(c.footerProduct, [
          ["/register", c.createAccount],
          ["/login", c.signIn],
          ["/find", c.find],
          ["/login?demo=1", c.demo],
        ])}
        {col(c.footerCompany, [
          ["/about", c.navAbout],
          ["/privacy", c.navPrivacyPolicy],
          ["/terms", c.navTerms],
        ])}
        <div>
          <p className="text-sm font-semibold text-ink">{c.footerContact}</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>
              <a href={`mailto:${BRAND.contact}`} className="transition hover:text-ink">
                {BRAND.contact}
              </a>
            </li>
            <li>{BRAND.domain}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink/[0.06]">
        <p className="mx-auto max-w-6xl px-5 py-5 text-xs text-muted">
          © {new Date().getFullYear()} {BRAND.name}. {c.rights}
        </p>
      </div>
    </footer>
  );
}
