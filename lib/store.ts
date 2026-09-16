import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { sharedCodeFor, uniqueCodeBatch } from "./codes";
import type { Db, EventPromo, PublicEvent, Redemption } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "db.json");

/**
 * Serialises read-modify-write cycles within this process.
 *
 * Two people clicking "Claim" at the same booth at the same moment must not
 * both read the same `grantedCents` and both pass the budget check — that is
 * exactly how a capped budget gets overspent.
 */
let queue: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

async function readDb(): Promise<Db> {
  try {
    return JSON.parse(await readFile(DB_PATH, "utf8")) as Db;
  } catch {
    const seeded = seed();
    await writeDb(seeded);
    return seeded;
  }
}

async function writeDb(db: Db): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  // Write-then-rename: a crash mid-write leaves the previous file intact
  // rather than a truncated JSON blob that takes the whole app down.
  const tmp = `${DB_PATH}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await rename(tmp, DB_PATH);
}

export async function listEvents(): Promise<EventPromo[]> {
  const db = await readDb();
  return [...db.events].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getEventBySlug(slug: string): Promise<EventPromo | null> {
  const db = await readDb();
  return db.events.find((e) => e.slug === slug) ?? null;
}

export async function getEventById(id: string): Promise<EventPromo | null> {
  const db = await readDb();
  return db.events.find((e) => e.id === id) ?? null;
}

export async function listRedemptions(eventId: string): Promise<Redemption[]> {
  const db = await readDb();
  return db.redemptions
    .filter((r) => r.eventId === eventId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listUniqueCodes(eventId: string) {
  const db = await readDb();
  return db.uniqueCodes.filter((c) => c.eventId === eventId);
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
  return withLock(async () => {
    const db = await readDb();
    if (db.events.some((e) => e.slug === input.slug)) {
      throw new Error(`An event page already uses the slug "${input.slug}".`);
    }

    const event: EventPromo = {
      id: randomUUID(),
      slug: input.slug,
      title: input.title,
      description: input.description,
      // Always born as a draft: a page that grants credits the moment it is
      // created will start paying out while the copy is still being edited.
      status: "draft",
      codeMode: input.codeMode,
      sharedCode: input.codeMode === "shared" ? sharedCodeFor(input.slug) : null,
      creditCents: input.creditCents,
      budgetCapCents: input.budgetCapCents,
      grantedCents: 0,
      grantCount: 0,
      expiryDays: input.expiryDays,
      createdAt: new Date().toISOString(),
      activatedAt: null,
      endedAt: null,
    };

    db.events.push(event);

    if (input.codeMode === "unique") {
      const count = Math.max(1, Math.min(input.uniqueCodeCount ?? 100, 5000));
      for (const code of uniqueCodeBatch(count)) {
        db.uniqueCodes.push({ code, eventId: event.id, redeemedAt: null, redeemedBy: null });
      }
    }

    await writeDb(db);
    return event;
  });
}

export type UpdateEventInput = Partial<
  Pick<EventPromo, "title" | "description" | "creditCents" | "budgetCapCents" | "expiryDays" | "status">
>;

export async function updateEvent(id: string, patch: UpdateEventInput): Promise<EventPromo> {
  return withLock(async () => {
    const db = await readDb();
    const event = db.events.find((e) => e.id === id);
    if (!event) throw new Error("Event not found.");

    if (patch.budgetCapCents !== undefined && patch.budgetCapCents < event.grantedCents) {
      throw new Error(
        `Budget cap cannot be lower than the ${(event.grantedCents / 100).toFixed(2)} already granted.`,
      );
    }

    Object.assign(event, patch);

    if (patch.status === "active" && !event.activatedAt) event.activatedAt = new Date().toISOString();
    if (patch.status === "ended") event.endedAt = new Date().toISOString();

    await writeDb(db);
    return event;
  });
}

export type RedeemResult =
  | { ok: true; amountCents: number; expiresAt: string | null; eventTitle: string }
  | { ok: false; reason: string };

/**
 * Redeem a promo code for an account.
 *
 * Every rejection path returns the same shape so the caller never has to
 * distinguish "not found" from "already used" to render a message — and so
 * the response never leaks which codes exist.
 */
export async function redeemCode(rawCode: string, email: string): Promise<RedeemResult> {
  return withLock(async () => {
    const code = rawCode.trim().toUpperCase();
    const account = email.trim().toLowerCase();
    const db = await readDb();

    const event = db.events.find(
      (e) =>
        (e.codeMode === "shared" && e.sharedCode === code) ||
        (e.codeMode === "unique" && db.uniqueCodes.some((c) => c.code === code && c.eventId === e.id)),
    );

    if (!event) return { ok: false, reason: "That code isn't recognised. Check for typos and try again." };
    if (event.status === "draft") return { ok: false, reason: "This code isn't active yet." };
    if (event.status === "ended") return { ok: false, reason: "This offer has ended." };
    if (remainingCents(event) < event.creditCents) {
      return { ok: false, reason: "This offer has run out of credits." };
    }

    if (event.codeMode === "unique") {
      const entry = db.uniqueCodes.find((c) => c.code === code && c.eventId === event.id);
      if (!entry) return { ok: false, reason: "That code isn't recognised." };
      if (entry.redeemedAt) return { ok: false, reason: "That code has already been used." };
      entry.redeemedAt = new Date().toISOString();
      entry.redeemedBy = account;
    } else if (db.redemptions.some((r) => r.eventId === event.id && r.email === account)) {
      // One grant per account per event, or a single shared code drains the
      // whole cap from one laptop.
      return { ok: false, reason: "You've already claimed credits from this event." };
    }

    const now = new Date();
    const expiresAt = event.expiryDays
      ? new Date(now.getTime() + event.expiryDays * 86_400_000).toISOString()
      : null;

    db.redemptions.push({
      id: randomUUID(),
      eventId: event.id,
      code,
      email: account,
      amountCents: event.creditCents,
      createdAt: now.toISOString(),
      expiresAt,
    });

    event.grantedCents += event.creditCents;
    event.grantCount += 1;

    await writeDb(db);
    return { ok: true, amountCents: event.creditCents, expiresAt, eventTitle: event.title };
  });
}

function seed(): Db {
  const day = 86_400_000;
  const ago = (d: number) => new Date(Date.now() - d * day).toISOString();

  const events: EventPromo[] = [
    {
      id: "evt_agents_sf",
      slug: "agents-sf",
      title: "Agents SF",
      description:
        "Give your agent one key and 5,000+ live APIs for the weekend. Credits land in your promo balance the moment you sign up.",
      status: "active",
      codeMode: "shared",
      sharedCode: "AISA-AGENTS-SF-7K3M",
      creditCents: 20000,
      budgetCapCents: 2000000,
      grantedCents: 340000,
      grantCount: 17,
      expiryDays: 180,
      createdAt: ago(21),
      activatedAt: ago(20),
      endedAt: null,
    },
    {
      id: "evt_hermes_hack",
      slug: "hermes-hack",
      title: "Hermes Agent Hackathon",
      description:
        "Build a Hermes agent that pays its own way. Every API call, skill and model runs through a single Aisa key.",
      status: "active",
      codeMode: "unique",
      sharedCode: null,
      creditCents: 25000,
      budgetCapCents: 5000000,
      grantedCents: 450000,
      grantCount: 18,
      expiryDays: 30,
      createdAt: ago(14),
      activatedAt: ago(13),
      endedAt: null,
    },
    {
      id: "evt_x402_devday",
      slug: "x402-devday",
      title: "x402 Dev Day",
      description:
        "Machine payments, end to end. Point your agent at Aisa and let it settle per call in USDC over x402.",
      status: "active",
      codeMode: "shared",
      sharedCode: "AISA-X402-DEVDAY-QN84",
      creditCents: 10000,
      budgetCapCents: 1000000,
      grantedCents: 200000,
      grantCount: 20,
      expiryDays: 180,
      createdAt: ago(9),
      activatedAt: ago(8),
      endedAt: null,
    },
    {
      id: "evt_aisa_hq",
      slug: "aisa-hq",
      title: "Welcome to Aisa HQ",
      description: "You're on the guest wifi. Here's a starter balance to point an agent at while you're here.",
      status: "active",
      codeMode: "shared",
      sharedCode: "AISA-AISA-HQ-3RT9",
      creditCents: 2500,
      budgetCapCents: 1000000,
      grantedCents: 0,
      grantCount: 0,
      expiryDays: 180,
      createdAt: ago(30),
      activatedAt: ago(30),
      endedAt: null,
    },
    {
      id: "evt_token_factory",
      slug: "token-factory",
      title: "Token Factory Builders",
      description:
        "110+ models and 5,000+ APIs behind one key, billed per call. No per-vendor contracts to sign first.",
      status: "active",
      codeMode: "shared",
      sharedCode: "AISA-TOKEN-FACTORY-M2WD",
      creditCents: 60000,
      budgetCapCents: 2000000,
      grantedCents: 1980000,
      grantCount: 33,
      expiryDays: 180,
      createdAt: ago(45),
      activatedAt: ago(44),
      endedAt: null,
    },
    {
      id: "evt_kubecon_2026",
      slug: "kubecon-2026",
      title: "KubeCon 2026",
      description: "",
      status: "draft",
      codeMode: "shared",
      sharedCode: "AISA-KUBECON-2026-8DPX",
      creditCents: 2500,
      budgetCapCents: 100000,
      grantedCents: 0,
      grantCount: 0,
      expiryDays: null,
      createdAt: ago(2),
      activatedAt: null,
      endedAt: null,
    },
    {
      id: "evt_ethdenver",
      slug: "ethdenver-2026",
      title: "ETHDenver 2026",
      description: "Agentic commerce, settled onchain. One key for every resource your agent calls.",
      status: "ended",
      codeMode: "shared",
      sharedCode: "AISA-ETHDENVER-2026-VK57",
      creditCents: 15000,
      budgetCapCents: 750000,
      grantedCents: 750000,
      grantCount: 50,
      expiryDays: 90,
      createdAt: ago(120),
      activatedAt: ago(119),
      endedAt: ago(60),
    },
  ];

  return { events, uniqueCodes: [], redemptions: [] };
}
