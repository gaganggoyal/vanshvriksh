export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg width="36" height="36" viewBox="0 0 64 64" aria-hidden>
        <rect width="64" height="64" rx="16" fill="#6B1D2A" />
        <path
          d="M32 10c1.2 7 3 11 8 16-6 1-9 4-10 10 1-6-2-10-10-10 6-5 8-9 8-16 2 8 6 12 14 14-5 0-8 3-10 8 3-8 8-12 16-12-8 2-12 6-16 16 0-8-3-13-10-18 8 2 12 6 16 14-2-8-6-14-14-22z"
          fill="#E2C98A"
        />
        <path d="M32 36v16" stroke="#C4A35A" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="32" cy="54" r="2" fill="#C4A35A" />
      </svg>
      <div className="leading-tight">
        <div className="font-devanagari text-xl text-maroon">वंश वृक्ष</div>
        <div className="keep-tracking text-[10px] uppercase tracking-[0.28em] text-gold-dim">Vansh Vriksh</div>
      </div>
    </div>
  );
}
