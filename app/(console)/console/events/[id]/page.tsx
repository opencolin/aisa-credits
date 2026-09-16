import Link from "next/link";
import { notFound } from "next/navigation";

import { ExternalIcon } from "~/components/icons";
import { formatCredit, formatDate } from "~/lib/format";
import { getEventById, isOfferLive, listRedemptions, listUniqueCodes, remainingCents } from "~/lib/store";
import { ConsoleTopbar } from "../../../_components/topbar";
import { CodePanel } from "./_components/code-panel";
import { SettingsForm } from "./_components/settings-form";

export const dynamic = "force-dynamic";

export default async function ManageEventScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();

  const [redemptions, codes] = await Promise.all([listRedemptions(event.id), listUniqueCodes(event.id)]);
  const remaining = remainingCents(event);
  const live = isOfferLive(event);

  return (
    <>
      <ConsoleTopbar crumb={`Event Pages / ${event.title}`} />

      <main className="min-w-0 flex-1 px-6 py-8">
        <div className="mx-auto max-w-[1080px]">
          <Link href="/console/events" className="text-fg-muted hover:text-fg text-sm">
            ← Event Pages
          </Link>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-[32px]">{event.title}</h1>
              <Link
                href={`/events/${event.slug}`}
                target="_blank"
                className="text-fg-muted hover:text-brand mt-2 inline-flex items-center gap-1.5 font-mono text-sm transition-colors"
              >
                aisa.one/events/{event.slug}
                <ExternalIcon className="h-3.5 w-3.5" />
              </Link>
            </div>
            <span
              className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                event.status === "active"
                  ? "border-positive/40 bg-positive/10 text-positive"
                  : "border-line bg-surface-2 text-fg-muted"
              }`}
            >
              {event.status}
            </span>
          </div>

          {event.status === "active" && !live && (
            <p className="border-warning/40 bg-warning/10 text-warning mt-6 rounded-lg border px-4 py-3 text-sm">
              This page is active but its remaining budget ({formatCredit(remaining)}) can&apos;t cover another{" "}
              {formatCredit(event.creditCents)} grant. The public page has already stopped promising credits — raise
              the cap or end the event.
            </p>
          )}

          <div className="border-line mt-8 grid gap-px border-t pt-8 sm:grid-cols-4">
            {[
              { label: "Credit per signup", value: formatCredit(event.creditCents) },
              { label: "Granted", value: formatCredit(event.grantedCents), note: `${event.grantCount} signups` },
              { label: "Remaining", value: formatCredit(remaining) },
              { label: "Expiry", value: event.expiryDays ? `${event.expiryDays} days` : "Never" },
            ].map((stat) => (
              <div key={stat.label} className="pr-6">
                <p className="eyebrow">{stat.label}</p>
                <p className="font-display text-fg mt-2 text-2xl font-bold">{stat.value}</p>
                {stat.note && <p className="text-fg-subtle mt-1 text-xs">{stat.note}</p>}
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <CodePanel
              codeMode={event.codeMode}
              sharedCode={event.sharedCode}
              codes={codes.map((c) => ({ code: c.code, used: Boolean(c.redeemedAt) }))}
            />
            <SettingsForm event={event} />
          </div>

          <section className="mt-10">
            <h2 className="text-fg text-xl">Redemptions</h2>
            <p className="text-fg-muted mt-1 mb-4 text-sm">
              {redemptions.length === 0
                ? "No credits granted from this page yet."
                : `${redemptions.length} grant${redemptions.length === 1 ? "" : "s"}, newest first.`}
            </p>

            {redemptions.length > 0 && (
              <div className="border-line bg-surface overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-line text-fg-subtle border-b text-left">
                      {["Account", "Code", "Amount", "Claimed", "Expires"].map((h) => (
                        <th key={h} className="px-4 py-3 text-xs font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-line divide-y">
                    {redemptions.map((r) => (
                      <tr key={r.id}>
                        <td className="text-fg px-4 py-3">{r.email}</td>
                        <td className="text-fg-muted px-4 py-3 font-mono text-xs">{r.code}</td>
                        <td className="text-fg px-4 py-3">{formatCredit(r.amountCents)}</td>
                        <td className="text-fg-muted px-4 py-3">{formatDate(r.createdAt)}</td>
                        <td className="text-fg-muted px-4 py-3">
                          {r.expiresAt ? formatDate(r.expiresAt) : "Never"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
