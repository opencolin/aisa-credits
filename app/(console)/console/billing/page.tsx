import { ConsoleTopbar } from "../../_components/topbar";
import { ClaimPanel } from "./_components/claim-panel";

export const dynamic = "force-dynamic";

// Static stand-ins: this app owns event credits, not the billing system.
// They exist so the Claim box is shown in the context it really lives in.
const STATS = [
  { label: "Current plan", value: "Pay as you go", note: "No active paid subscription" },
  { label: "PAYG balance", value: "$1.00", note: "Includes available trial, promo and cash credits" },
  { label: "Auto top-up", value: "Disabled", note: "Manage →", muted: true },
];

export default function BillingScreen() {
  return (
    <>
      <ConsoleTopbar
        crumb="Billing & balances"
        badge={
          <span className="border-brand/40 bg-brand-tint text-brand rounded-lg border px-3 py-1.5 text-[11px] font-bold tracking-wider">
            TRIAL
          </span>
        }
      />

      <main className="min-w-0 flex-1 px-6 py-8">
        <div className="mx-auto max-w-[1080px]">
          <h1 className="text-[34px]">Billing &amp; balances</h1>
          <p className="text-fg-muted mt-2 text-sm">Keep your balance funded, or claim credits from an event.</p>

          <div className="border-line mt-8 grid gap-6 border-t pt-8 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <p className="eyebrow">{stat.label}</p>
                <p
                  className={`font-display mt-2 text-[28px] font-bold ${stat.muted ? "text-fg-subtle" : "text-fg"}`}
                >
                  {stat.value}
                </p>
                <p className="text-fg-subtle mt-1 text-xs">{stat.note}</p>
              </div>
            ))}
            <ClaimPanel />
          </div>
        </div>
      </main>
    </>
  );
}
