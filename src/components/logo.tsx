import { BRAND } from "@/lib/brand";

/** Three connected people — a family graph, not a symbol. */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="mv-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5B4BF5" />
          <stop offset="1" stopColor="#B62AD9" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#mv-g)" />
      <path
        d="M32 21v9M32 30H20v8M32 30h12v8"
        stroke="#fff"
        strokeOpacity=".75"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="17" r="5" fill="#fff" />
      <circle cx="20" cy="43" r="5" fill="#fff" />
      <circle cx="44" cy="43" r="5" fill="#34C79A" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <div className="leading-none">
        <div className="whitespace-nowrap font-display text-[19px] font-bold tracking-tight text-ink">{BRAND.name}</div>
        <div className="mt-1 hidden whitespace-nowrap text-[11px] font-medium text-muted sm:block">
          {BRAND.descriptor} · <span className="font-devanagari">{BRAND.nameHi}</span>
        </div>
      </div>
    </div>
  );
}
