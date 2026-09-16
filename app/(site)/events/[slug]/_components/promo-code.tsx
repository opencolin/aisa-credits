"use client";

import { useEffect, useState } from "react";

/**
 * The booth code, made easy to get off the screen and into a console.
 *
 * Signing up through this page applies the code on its own — this exists for
 * the person who photographed the slide and is claiming later from a laptop.
 */
export function PromoCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <div className="border-line bg-surface inline-flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border p-1.5 pl-4 shadow-sm">
      <span className="eyebrow">Promo code</span>
      <code className="font-mono text-fg text-[15px] font-semibold tracking-tight">{code}</code>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(code).then(
            () => setCopied(true),
            () => setCopied(false),
          );
        }}
        className="bg-surface-2 hover:bg-line text-fg rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
