/**
 * The Aisa wordmark.
 *
 * Body copy throughout this app uses "Aisa"; the mark keeps the AI/sa colour
 * split. That split is the one place the intercap is load-bearing — see the
 * naming decision in the copy audit (aisa-copy/README.md §1), which
 * recommends keeping the logo as-is and letting prose behave like an ordinary
 * proper noun.
 */
export function AisaLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <AisaMark className="h-7 w-7" />
      <span className="font-display text-[22px] font-extrabold tracking-[-0.04em]">
        <span className="text-brand">AI</span>
        <span className="text-fg">sa</span>
      </span>
    </span>
  );
}

export function AisaMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path
        d="M16 1.7 28.1 8.6a1.9 1.9 0 0 1 .95 1.65v11.5c0 .68-.36 1.31-.95 1.65L16 30.3a1.9 1.9 0 0 1-1.9 0L2 23.4a1.9 1.9 0 0 1-.95-1.65v-11.5c0-.68.36-1.31.95-1.65L14.1 1.7a1.9 1.9 0 0 1 1.9 0Z"
        fill="var(--brand)"
      />
      <path
        d="M16 8.4c1.9 3.1 3.6 4.8 6.8 6.1-3.2 1.3-4.9 3-6.8 6.1-1.9-3.1-3.6-4.8-6.8-6.1 3.2-1.3 4.9-3 6.8-6.1Z"
        fill="#fff"
        fillOpacity="0.92"
      />
      <circle cx="16" cy="24.2" r="1.9" fill="#fff" fillOpacity="0.92" />
    </svg>
  );
}
