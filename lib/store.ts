import "server-only";

import { randomUUID } from "node:crypto";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

import { sharedCodeFor, uniqueCodeBatch } from "./codes";
import type { EventPromo, PublicEvent, Redemption, UniqueCode } from "./types";

/**
 * Postgres on Neon, provisioned through the Vercel integration (DATABASE_URL).
 *
 * This replaced a JSON file guarded by an in-process lock. Both halves of that stopped
 * being true on Vercel: the filesystem is not shared or kept between function instances,
 * and a lock inside one instance is invisible to the others. The budget rule now lives in
 * the database — see redeem_code() in db/schema.mjs.
 *
 * Every exported signature is unchanged, so no page or component had to learn about this.
 */
let client: NeonQueryFunction<false, false> | null = null;
function db() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set — connect the Neon integration or run `vercel env pull`.");
    client = neon(url);
  }
  return client;
}

/** The driver hands timestamps back as Date or string depending on the path; the app wants ISO. */
const iso = (v: unknown): string => new Date(v as string).toISOString();
const isoOrNull = (v: unknown): string | null => (v == null ? null : iso(v));

type Row = Record<string, unknown>;

function toEvent(r: Row): EventPromo {
  return {
    id: String(r.id),
    slug: String(r.slug),
    title: String(r.title),
    description: String(r.description ?? ""),
    status: r.status as EventPromo["status"],
    codeMode: r.code_mode as EventPromo["codeMode"],
    sharedCode: (r.shared_code as string | null) ?? null,
    creditCents: Number(r.credit_cents),
    budgetCapCents: Number(r.budget_cap_cents),
    grantedCents: Number(r.granted_cents),
    grantCount: Number(r.grant_count),
    expiryDays: r.expiry_days == null ? null : Number(r.expiry_days),
    createdAt: iso(r.created_at),
    activatedAt: isoOrNull(r.activated_at),
    endedAt: isoOrNull(r.ended_at),
  };
}

export async function listEvents(): Promise<EventPromo[]> {
  const rows = await db().query("select * from events order by created_at desc");
  return rows.map(toEvent);
}

export async function getEventBySlug(slug: string): Promise<EventPromo | null> {
  const rows = await db().query("select * from events where slug = $1", [slug]);
  return rows[0] ? toEvent(rows[0]) : null;
}

export async function getEventById(id: string): Promise<EventPromo | null> {
  const rows = await db().query("select * from events where id = $1", [id]);
  return rows[0] ? toEvent(rows[0]) : null;
}

export async function listRedemptions(eventId: string): Promise<Redemption[]> {
  const rows = await db().query("select * from redemptions where event_id = $1 order by created_at desc", [eventId]);
  return rows.map((r) => ({
    id: String(r.id),
    eventId: String(r.event_id),
    code: String(r.code),
    email: String(r.email),
    amountCents: Number(r.amount_cents),
    createdAt: iso(r.created_at),
    expiresAt: isoOrNull(r.expires_at),
  }));
}

export async function listUniqueCodes(eventId: string): Promise<UniqueCode[]> {
  const rows = await db().query("select * from unique_codes where event_id = $1 order by code", [eventId]);
  return rows.map((r) => ({
    code: String(r.code),
    eventId: String(r.event_id),
    redeemedAt: isoOrNull(r.redeemed_at),
    redeemedBy: (r.redeemed_by as string | null) ?? null,
  }));
}

export function remainingCents(event: EventPromo): number {
  return Math.max(0, event.budgetCapCents - event.grantedCents);
}

/**
 * True only when a signup arriving right now would actually receive credits.
 * The landing page keys every credit promise off this, not off `status`.
 */
export function isOfferLive(event: EventPromo): boolean {
  return event.status === "active" && remainingCents(event) >= event.creditCents;
}

export function toPublicEvent(event: EventPromo): PublicEvent {
  return {
    slug: event.slug,
    title: event.title,
    description: event.description,
    creditCents: event.creditCents,
    codeMode: event.codeMode,
    // A single-use code is only meaningful to the person holding it, so the
    // public page never renders one; only the shared booth code is shown.
    sharedCode: event.codeMode === "shared" ? event.sharedCode : null,
    expiryDays: event.expiryDays,
    offerLive: isOfferLive(event),
    remainingCents: remainingCents(event),
  };
}

/** Postgres error codes this file turns into sentences. */
const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";
const pgError = (err: unknown) => err as { code?: string; constraint?: string };

export type CreateEventInput = {
  title: string;
  slug: string;
  description: string;
  creditCents: number;
  budgetCapCents: number;
  expiryDays: number | null;
  codeMode: "shared" | "unique";
  uniqueCodeCount?: number;
};

export async function createEvent(input: CreateEventInput): Promise<EventPromo> {
  const sql = db();
  const id = randomUUID();
  const insertEvent = sql.query(
    // Always born as a draft: a page that grants credits the moment it is created
    // will start paying out while the copy is still being edited.
    `insert into events (id, slug, title, description, status, code_mode, shared_code,
       credit_cents, budget_cap_cents, expiry_days)
     values ($1, $2, $3, $4, 'draft', $5, $6, $7, $8, $9)
     returning *`,
    [
      id,
      input.slug,
      input.title,
      input.description,
      input.codeMode,
      input.codeMode === "shared" ? sharedCodeFor(input.slug) : null,
      input.creditCents,
      input.budgetCapCents,
      input.expiryDays,
    ],
  );

  const queries = [insertEvent];
  if (input.codeMode === "unique") {
    const count = Math.max(1, Math.min(input.uniqueCodeCount ?? 100, 5000));
    queries.push(
      sql.query("insert into unique_codes (code, event_id) select unnest($1::text[]), $2", [uniqueCodeBatch(count), id]),
    );
  }

  try {
    // One transaction: an event never exists without the batch of codes it was created with.
    const [rows] = await sql.transaction(queries);
    return toEvent((rows as Row[])[0]);
  } catch (err) {
    const e = pgError(err);
    if (e.code === UNIQUE_VIOLATION && e.constraint === "events_slug_key") {
      throw new Error(`An event page already uses the slug "${input.slug}".`);
    }
    throw err;
  }
}

export type UpdateEventInput = Partial<
  Pick<EventPromo, "title" | "description" | "creditCents" | "budgetCapCents" | "expiryDays" | "status">
>;

export async function updateEvent(id: string, patch: UpdateEventInput): Promise<EventPromo> {
  try {
    const rows = await db().query(
      `update events set
         title            = coalesce($2, title),
         description      = coalesce($3, description),
         credit_cents     = coalesce($4, credit_cents),
         budget_cap_cents = coalesce($5, budget_cap_cents),
         expiry_days      = case when $6::boolean then $7::integer else expiry_days end,
         status           = coalesce($8, status),
         activated_at     = case when $8::text = 'active' and activated_at is null then now() else activated_at end,
         ended_at         = case when $8::text = 'ended' then now() else ended_at end
       where id = $1
       returning *`,
      [
        id,
        patch.title ?? null,
        patch.description ?? null,
        patch.creditCents ?? null,
        patch.budgetCapCents ?? null,
        // expiryDays distinguishes "leave it" (undefined) from "never expires" (null).
        patch.expiryDays !== undefined,
        patch.expiryDays ?? null,
        patch.status ?? null,
      ],
    );
    if (!rows[0]) throw new Error("Event not found.");
    return toEvent(rows[0]);
  } catch (err) {
    const e = pgError(err);
    if (e.code === CHECK_VIOLATION && e.constraint === "granted_within_cap") {
      // Checked by the database rather than by reading first: a grant can land between a
      // read and this write, and the constraint is the only check that sees it.
      const current = await getEventById(id);
      const granted = current ? (current.grantedCents / 100).toFixed(2) : "the amount";
      throw new Error(`Budget cap cannot be lower than the ${granted} already granted.`);
    }
    throw err;
  }
}

export type RedeemResult =
  | { ok: true; amountCents: number; expiresAt: string | null; eventTitle: string }
  | { ok: false; reason: string };

/**
 * Redeem a promo code for an account — one call to redeem_code() in the database, which
 * locks the event row for the length of the claim. Every rejection path returns the same
 * shape, so a caller never has to tell "not found" from "already used", and the response
 * never reveals which codes exist.
 */
export async function redeemCode(rawCode: string, email: string): Promise<RedeemResult> {
  const rows = await db().query("select redeem_code($1, $2) as result", [rawCode, email]);
  return rows[0].result as RedeemResult;
}
