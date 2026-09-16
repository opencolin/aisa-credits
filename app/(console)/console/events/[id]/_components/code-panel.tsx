"use client";

import { useState } from "react";

import { CopyIcon } from "~/components/icons";

type Code = { code: string; used: boolean };

export function CodePanel({
  codeMode,
  sharedCode,
  codes,
}: {
  codeMode: "shared" | "unique";
  sharedCode: string | null;
  codes: Code[];
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const unused = codes.filter((c) => !c.used);

  return (
    <section className="border-line bg-surface rounded-xl border p-6">
      <h2 className="text-fg text-xl">Promo code</h2>

      {codeMode === "shared" ? (
        <>
          <p className="text-fg-muted mt-1.5 text-sm">
            Redeemable by anyone until the budget cap is reached, once per account.
          </p>
          <div className="border-line bg-bg mt-4 flex items-center justify-between gap-3 rounded-lg border p-4">
            <code className="text-fg font-mono text-lg font-semibold">{sharedCode}</code>
            <button
              type="button"
              onClick={() => copy(sharedCode ?? "", "shared")}
              className="border-line hover:bg-surface-2 text-fg inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              <CopyIcon className="h-3.5 w-3.5" />
              {copied === "shared" ? "Copied" : "Copy"}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-fg-muted mt-1.5 text-sm">
            {codes.length} single-use codes · {unused.length} still unclaimed.
          </p>

          <button
            type="button"
            onClick={() => copy(unused.map((c) => c.code).join("\n"), "batch")}
            disabled={unused.length === 0}
            className="border-line hover:bg-surface-2 text-fg mt-4 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <CopyIcon className="h-3.5 w-3.5" />
            {copied === "batch" ? "Copied" : `Copy ${unused.length} unclaimed codes`}
          </button>

          <div className="border-line bg-bg mt-4 max-h-56 overflow-y-auto rounded-lg border p-3">
            <div className="grid grid-cols-2 gap-1.5">
              {codes.slice(0, 200).map((c) => (
                <code
                  key={c.code}
                  className={`font-mono text-[11px] ${c.used ? "text-fg-subtle line-through" : "text-fg-muted"}`}
                >
                  {c.code}
                </code>
              ))}
            </div>
            {codes.length > 200 && (
              <p className="text-fg-subtle mt-2 text-xs">+{codes.length - 200} more — use copy to export them all.</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
