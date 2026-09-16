"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ExternalIcon, PlusIcon } from "~/components/icons";
import { formatCredit } from "~/lib/format";
import type { EventPromo } from "~/lib/types";
import { setStatusAction } from "../actions";
import { NewEventDialog } from "./new-event-dialog";

type Filter = "all" | "active" | "draft" | "ended";

export function EventsTable({ events }: { events: EventPromo[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [creating, setCreating] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (filter !== "all" && e.status !== filter) return false;
      if (!q) return true;
      return (
        e.slug.includes(q) ||
        e.title.toLowerCase().includes(q) ||
        (e.sharedCode ?? "").toLowerCase().includes(q)
      );
    });
  }, [events, query, filter]);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search slug, title or code…"
          aria-label="Search event pages"
          className="border-line bg-surface text-fg placeholder:text-fg-subtle focus:border-brand h-10 w-full max-w-xs rounded-lg border px-3 text-sm outline-none"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as Filter)}
          aria-label="Filter by status"
          className="border-line bg-surface text-fg h-10 rounded-lg border px-3 text-sm outline-none"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="ended">Ended</option>
        </select>

        <button
          type="button"
          onClick={() => setCreating(true)}
          className="bg-brand hover:bg-brand-hover ml-auto inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          New event
        </button>
      </div>

      <div className="border-line bg-surface overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[1020px] text-sm">
          <thead>
            <tr className="border-line text-fg-subtle border-b text-left">
              {["Slug", "Title", "Code", "Credit", "Expiry", "Budget", "Grants", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-semibold tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {rows.map((event) => (
              <Row key={event.id} event={event} />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="text-fg-subtle px-4 py-12 text-center text-sm">
                  No event pages match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {creating && <NewEventDialog onClose={() => setCreating(false)} />}
    </>
  );
}

function Row({ event }: { event: EventPromo }) {
  const [busy, setBusy] = useState(false);
  const used = event.budgetCapCents === 0 ? 0 : event.grantedCents / event.budgetCapCents;
  const remaining = Math.max(0, event.budgetCapCents - event.grantedCents);
  // "Active" alone doesn't mean the page can pay — the bar turns amber when
  // what's left can't cover one more grant.
  const dry = event.status === "active" && remaining < event.creditCents;

  return (
    <tr className="hover:bg-surface-2/50 transition-colors">
      <td className="px-4 py-3">
        <Link
          href={`/events/${event.slug}`}
          target="_blank"
          className="text-fg hover:text-brand inline-flex items-center gap-1.5 font-mono text-[13px] transition-colors"
        >
          {event.slug}
          <ExternalIcon className="h-3.5 w-3.5 opacity-60" />
        </Link>
      </td>
      <td className="text-fg max-w-[200px] truncate px-4 py-3 font-medium">{event.title}</td>
      <td className="px-4 py-3">
        {event.codeMode === "shared" ? (
          <code className="text-fg-muted font-mono text-[11px]">{event.sharedCode}</code>
        ) : (
          <span className="border-line text-fg-muted rounded border px-1.5 py-0.5 text-[11px]">single-use batch</span>
        )}
      </td>
      <td className="text-fg px-4 py-3 font-medium whitespace-nowrap">{formatCredit(event.creditCents)}</td>
      <td className="text-fg-muted px-4 py-3 whitespace-nowrap">
        {event.expiryDays ? `${event.expiryDays} days` : "Never"}
      </td>
      <td className="px-4 py-3">
        <div className="w-[180px]">
          <div className="text-fg-muted mb-1 flex justify-between text-[11px]">
            <span>
              {formatCredit(event.grantedCents)} / {formatCredit(event.budgetCapCents)}
            </span>
            <span>{Math.round(used * 100)}%</span>
          </div>
          <div className="bg-surface-2 h-1.5 overflow-hidden rounded-full">
            <div
              className={`h-full rounded-full ${dry ? "bg-warning" : "bg-brand"}`}
              style={{ width: `${Math.min(100, used * 100)}%` }}
            />
          </div>
          <p className={`mt-1 text-[11px] ${dry ? "text-warning" : "text-fg-subtle"}`}>
            {dry ? "Can't cover another grant" : `${formatCredit(remaining)} remaining`}
          </p>
        </div>
      </td>
      <td className="text-fg px-4 py-3">{event.grantCount}</td>
      <td className="px-4 py-3">
        <StatusBadge status={event.status} />
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <Link
            href={`/console/events/${event.id}`}
            className="border-line hover:bg-surface-2 text-fg rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
          >
            Manage
          </Link>
          {event.status === "draft" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                setStatusAction(event.id, "active").finally(() => setBusy(false));
              }}
              className="bg-brand hover:bg-brand-hover rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
            >
              Activate
            </button>
          )}
          {event.status === "active" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                // Ending an offer stops payouts immediately and takes the
                // public page out of the index — worth a beat of friction.
                if (!confirm(`End "${event.title}"? The page stops granting credits right away.`)) return;
                setBusy(true);
                setStatusAction(event.id, "ended").finally(() => setBusy(false));
              }}
              className="border-danger/40 text-danger hover:bg-danger/10 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              End
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: EventPromo["status"] }) {
  const styles = {
    active: "border-positive/40 bg-positive/10 text-positive",
    draft: "border-line bg-surface-2 text-fg-muted",
    ended: "border-line bg-surface-2 text-fg-subtle",
  }[status];

  return <span className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${styles}`}>{status}</span>;
}
