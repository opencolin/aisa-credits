"use client";

import { useState } from "react";
import { renderSVG } from "uqr";

/** Booth screens and slides need a code people can scan from across a room. */
export function QrDialog({ url, title, credits }: { url: string; title: string; credits: string | null }) {
  const [open, setOpen] = useState(false);
  const svg = renderSVG(url, { border: 1 });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-line bg-surface hover:bg-surface-2 text-fg inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <path d="M14 14h3v3h-3zM19 19h2v2h-2z" />
        </svg>
        QR code
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`${title} QR code`}
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-surface relative w-full max-w-lg rounded-2xl p-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-fg-muted hover:text-fg absolute top-4 right-4 text-sm font-semibold"
            >
              Close
            </button>
            {credits && <p className="eyebrow text-brand mb-1">Claim {credits} in credits</p>}
            <h2 className="text-fg mb-6 text-2xl">{title}</h2>
            <div
              className="mx-auto w-full max-w-[280px] [&>svg]:h-auto [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            <p className="text-fg-subtle mt-6 text-xs tracking-[0.12em] uppercase">Scan the code or visit</p>
            <p className="text-brand mt-1 font-semibold break-all">{url.replace(/^https?:\/\//, "")}</p>
          </div>
        </div>
      )}
    </>
  );
}
