import { ConsoleTopbar } from "../../_components/topbar";
import { formatCredit } from "~/lib/format";
import { isOfferLive, listEvents } from "~/lib/store";
import { EventsTable } from "./_components/events-table";

export const dynamic = "force-dynamic";

export default async function EventPagesScreen() {
  const events = await listEvents();

  const active = events.filter((e) => e.status === "active");
  const committed = active.reduce((sum, e) => sum + e.budgetCapCents, 0);
  const granted = events.reduce((sum, e) => sum + e.grantedCents, 0);
  const grants = events.reduce((sum, e) => sum + e.grantCount, 0);
  // An active page whose budget can no longer cover a single grant is still
  // "active" in the table but is silently advertising nothing — call it out.
  const exhausted = active.filter((e) => !isOfferLive(e)).length;

  const stats = [
    { label: "Active pages", value: String(active.length), note: `${events.length} total` },
    { label: "Committed budget", value: formatCredit(committed), note: "Across active pages" },
    { label: "Granted to date", value: formatCredit(granted), note: `${grants} signups credited` },
    {
      label: "Budget exhausted",
      value: String(exhausted),
      note: exhausted ? "Active pages granting nothing" : "All active pages can pay out",
      warn: exhausted > 0,
    },
  ];

  return (
    <>
      <ConsoleTopbar
        crumb="Event Pages"
        badge={
          <span className="border-danger/40 bg-danger/10 text-danger rounded-lg border px-3 py-1.5 text-[11px] font-bold tracking-wider">
            PRODUCTION
          </span>
        }
      />

      <main className="min-w-0 flex-1 px-6 py-8">
        <div className="mx-auto max-w-[1280px]">
          <p className="eyebrow text-brand">Growth</p>
          <h1 className="mt-2 text-[34px]">Event Pages</h1>
          <p className="text-fg-muted mt-2 text-sm">
            Public landing pages that hand out promo codes and grant signup credits against a budget cap.
          </p>

          <div className="border-line mt-8 grid gap-px border-t pt-8 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="pr-6">
                <p className="eyebrow">{stat.label}</p>
                <p
                  className={`font-display mt-2 text-[30px] font-bold ${stat.warn ? "text-warning" : "text-fg"}`}
                >
                  {stat.value}
                </p>
                <p className="text-fg-subtle mt-1 text-xs">{stat.note}</p>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <EventsTable events={events} />
          </div>
        </div>
      </main>
    </>
  );
}
