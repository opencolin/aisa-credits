// node --env-file=.env.local scripts/db.mjs            migrate, then seed an empty database
// node --env-file=.env.local scripts/db.mjs migrate    schema only
//
// DATABASE_URL comes from the Neon integration on the Vercel project (`vercel env pull`).
import { randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { SCHEMA } from "../db/schema.mjs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set — run `npx vercel env pull .env.local` first.");
  process.exit(1);
}
const sql = neon(url);
const only = process.argv[2];

for (const statement of SCHEMA) await sql.query(statement);
console.log(`migrated: ${SCHEMA.length} statements`);
if (only === "migrate") process.exit(0);

// Seeding is for a fresh database only. Once a single event exists — a real one, or the
// demo set from an earlier run — this does nothing, so it can never overwrite live data.
const [{ n }] = await sql.query("select count(*)::int as n from events");
if (n > 0) {
  console.log(`seed skipped: ${n} events already exist`);
  process.exit(0);
}

const day = 86_400_000;
const ago = (d) => new Date(Date.now() - d * day).toISOString();

const events = [
  ["evt_agents_sf", "agents-sf", "Agents SF", "Give your agent one key and 5,000+ live APIs for the weekend. Credits land in your promo balance the moment you sign up.", "active", "shared", "AISA-AGENTS-SF-7K3M", 20000, 2000000, 340000, 17, 180, ago(21), ago(20), null],
  ["evt_hermes_hack", "hermes-hack", "Hermes Agent Hackathon", "Build a Hermes agent that pays its own way. Every API call, skill and model runs through a single Aisa key.", "active", "unique", null, 25000, 5000000, 450000, 18, 30, ago(14), ago(13), null],
  ["evt_x402_devday", "x402-devday", "x402 Dev Day", "Machine payments, end to end. Point your agent at Aisa and let it settle per call in USDC over x402.", "active", "shared", "AISA-X402-DEVDAY-QN84", 10000, 1000000, 200000, 20, 180, ago(9), ago(8), null],
  ["evt_aisa_hq", "aisa-hq", "Welcome to Aisa HQ", "You're on the guest wifi. Here's a starter balance to point an agent at while you're here.", "active", "shared", "AISA-AISA-HQ-3RT9", 2500, 1000000, 0, 0, 180, ago(30), ago(30), null],
  ["evt_token_factory", "token-factory", "Token Factory Builders", "110+ models and 5,000+ APIs behind one key, billed per call. No per-vendor contracts to sign first.", "active", "shared", "AISA-TOKEN-FACTORY-M2WD", 60000, 2000000, 1980000, 33, 180, ago(45), ago(44), null],
  ["evt_kubecon_2026", "kubecon-2026", "KubeCon 2026", "", "draft", "shared", "AISA-KUBECON-2026-8DPX", 2500, 100000, 0, 0, null, ago(2), null, null],
  ["evt_ethdenver", "ethdenver-2026", "ETHDenver 2026", "Agentic commerce, settled onchain. One key for every resource your agent calls.", "ended", "shared", "AISA-ETHDENVER-2026-VK57", 15000, 750000, 750000, 50, 90, ago(120), ago(119), ago(60)],
];

// Same alphabet as lib/codes.ts: no I/L/O/U/0/1.
const ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
const chars = (n) => [...randomBytes(n * 2)].filter((b) => b < 240).slice(0, n).map((b) => ALPHABET[b % 30]).join("");
const codes = new Set();
while (codes.size < 100) codes.add(`AISA-${chars(4)}-${chars(4)}`);

await sql.transaction([
  ...events.map((e) =>
    sql.query(
      `insert into events (id, slug, title, description, status, code_mode, shared_code, credit_cents,
         budget_cap_cents, granted_cents, grant_count, expiry_days, created_at, activated_at, ended_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      e,
    ),
  ),
  // The seeded single-use event gets a real batch, so its Manage screen has codes to show.
  sql.query(`insert into unique_codes (code, event_id) select unnest($1::text[]), 'evt_hermes_hack'`, [[...codes]]),
]);
console.log(`seeded: ${events.length} events, ${codes.size} single-use codes`);
