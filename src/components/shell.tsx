"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "./logo";
import { LangSwitch, useCopy } from "./locale";

export function AppShell({
  children,
  pending = 0,
}: {
  children: React.ReactNode;
  pending?: number;
  email?: string;
}) {
  const { c } = useCopy();
  const path = usePathname();
  const router = useRouter();
  const item = (href: string, label: string, badge?: number) => (
    <Link
      href={href}
      aria-current={path.startsWith(href) ? "page" : undefined}
      className={`relative whitespace-nowrap rounded-full px-3 py-1.5 text-center text-xs sm:px-4 sm:text-sm ${
        path.startsWith(href) ? "bg-maroon text-paper" : "text-maroon hover:bg-gold/15"
      }`}
    >
      {label}
      {!!badge && (
        <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] text-ink">
          {badge}
        </span>
      )}
    </Link>
  );

  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-gold/25 bg-paper/80 px-4 py-3 backdrop-blur sm:px-6">
        <Link href="/tree">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {item("/tree", c.tree)}
          {item("/find", c.find)}
          {item("/matches", c.matches, pending)}
          {item("/settings", c.settings)}
        </nav>
        <div className="flex items-center gap-3">
          <LangSwitch />
          <button
            className="text-xs text-gold-dim hover:text-maroon"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/");
            }}
          >
            {c.logout}
          </button>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <nav className="sticky bottom-0 z-20 grid grid-cols-4 gap-1 border-t border-gold/25 bg-paper/95 p-2 backdrop-blur md:hidden">
        {item("/tree", c.tree)}
        {item("/find", c.find)}
        {item("/matches", c.matches, pending)}
        {item("/settings", c.settings)}
      </nav>
    </div>
  );
}
