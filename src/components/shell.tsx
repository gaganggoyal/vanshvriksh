"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Network, Search, Settings, Sparkles, type LucideIcon } from "lucide-react";
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
  const items: [string, string, LucideIcon, number?][] = [
    ["/tree", c.tree, Network],
    ["/find", c.find, Search],
    ["/matches", c.matches, Sparkles, pending],
    ["/settings", c.settings, Settings],
  ];

  const link = ([href, label, Icon, badge]: (typeof items)[number], compact = false) => {
    const active = path.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition ${
          compact ? "flex-col gap-1 px-2 py-1.5 text-[11px]" : "px-3.5 py-2"
        } ${active ? "bg-brand-tint text-brand" : "text-ink/60 hover:bg-ink/5 hover:text-ink"}`}
      >
        <Icon className={compact ? "h-5 w-5" : "h-4 w-4"} />
        {label}
        {!!badge && (
          <span
            className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-white ${
              compact ? "absolute right-1 top-0" : ""
            }`}
          >
            {badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-ink/[0.06] bg-white/80 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/tree" aria-label="Mera Vansh — your tree">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="App">
            {items.map((i) => link(i))}
          </nav>
          <div className="flex items-center gap-2">
            <LangSwitch />
            <button
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-ink/60 transition hover:bg-ink/5 hover:text-ink"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                router.push("/");
              }}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{c.logout}</span>
            </button>
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <nav
        className="sticky bottom-0 z-20 grid grid-cols-4 gap-1 border-t border-ink/[0.06] bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur md:hidden"
        aria-label="App"
      >
        {items.map((i) => link(i, true))}
      </nav>
    </div>
  );
}
