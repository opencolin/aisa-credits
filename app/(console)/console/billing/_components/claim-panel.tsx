"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Result = { ok: true; amountCents: number; expiresAt: string | null; eventTitle: string } | { ok: false; reason: string };

/** The "Promo balance — Claim →" affordance, with the redemption behind it. */
export function ClaimPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("demo@aisa.one");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const claimed = result?.ok ? result.amountCents : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, email }),
      });
      const data: Result = await res.json();
      setResult(data);
      if (data.ok) {
        setCode("");
        // The grant moved the event's budget — refresh so the Event Pages
        // table isn't showing a stale remaining balance.
        router.refresh();
      }
    } catch {
      setResult({ ok: false, reason: "Couldn't reach the server. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="eyebrow">Promo balance</p>
      <p className="font-display text-fg mt-2 flex items-center gap-2 text-[28px] font-bold">
        {(claimed / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-brand hover:text-brand-hover text-sm font-semibold transition-colors"
        >
          {open ? "Close" : "Claim →"}
        </button>
      </p>
      <p className="text-fg-subtle mt-1 text-xs">Already included in your PAYG balance</p>

      {open && (
        <form onSubmit={submit} className="border-line bg-surface mt-4 space-y-3 rounded-xl border p-4">
          <label className="block">
            <span className="text-fg mb-1.5 block text-xs font-semibold">Event code</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="AISA-AGENTS-SF-7K3M"
              required
              className="border-line bg-bg text-fg placeholder:text-fg-subtle focus:border-brand h-9 w-full rounded-lg border px-3 font-mono text-xs outline-none"
            />
          </label>
          <label className="block">
            <span className="text-fg mb-1.5 block text-xs font-semibold">Account email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-line bg-bg text-fg focus:border-brand h-9 w-full rounded-lg border px-3 text-xs outline-none"
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="bg-brand hover:bg-brand-hover w-full rounded-lg py-2 text-xs font-semibold text-white transition-colors disabled:opacity-60"
          >
            {busy ? "Claiming…" : "Claim credits"}
          </button>

          {result && (
            <p
              className={`rounded-lg border px-3 py-2 text-xs ${
                result.ok
                  ? "border-positive/40 bg-positive/10 text-positive"
                  : "border-danger/40 bg-danger/10 text-danger"
              }`}
            >
              {result.ok
                ? `Added ${(result.amountCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })} from ${result.eventTitle}.`
                : result.reason}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
