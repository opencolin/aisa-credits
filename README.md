# aisa-credits

Event promo codes and public landing pages for Aisa — an operator creates an
event, the app mints a code and publishes a page, and signups grant credits
against a budget cap.

Modelled on Tenki Cloud's event pages, restyled to Aisa and extended with the
promo-code layer Tenki didn't have ("no promo code required").

## Surfaces

| Route | Theme | What it is |
|---|---|---|
| `/events/[slug]` | light — matches `aisa.one` | Public landing page: offer, code, 3-step onboarding, FAQ, QR |
| `/console/events` | dark — matches `console.aisa.one` | Operator table: budgets, grants, status, create/activate/end |
| `/console/events/[id]` | dark | Per-event: code panel, settings, redemption log |
| `/console/billing` | dark | The Billing screen's "Promo balance → Claim" box |
| `POST /api/redeem` | — | The one place credits are granted |

## Design tokens

Not eyeballed. `app/globals.css` carries two scopes under the same semantic
names, so components are written once:

- **light** — sampled from computed styles on `aisa.one`: `--brand`
  `oklch(68.8% .192 44)` (`#F76918`), Plus Jakarta Sans display / Inter body,
  shadcn variable naming on Tailwind v4.
- **dark** — the console's warm near-black chrome, with the sidebar a shade
  below the content area.

Body copy uses **Aisa**; the wordmark keeps the `AI`/`sa` colour split. That
follows the naming decision in the copy audit (`aisa-copy` §1), which
recommends keeping the mark and letting prose behave like a proper noun.

## The rules worth knowing

- **A page never promises credits it can't grant.** `offerLive` is narrower
  than `status === "active"`: an active event whose remaining budget can't
  cover one more grant stops advertising, drops its code, and links to plain
  signup. The console flags these as *Budget exhausted*.
- **Budget caps hold under concurrency.** Redemption is serialised, so
  simultaneous claims at a booth can't both read the same `grantedCents` and
  both pass the check. Verified: 10 concurrent claims against a 3-grant cap
  yield exactly 3.
- **One grant per account per event** for shared codes; single-use codes are
  burned on redemption.
- **Events are born as drafts.** A page that pays out the moment it's created
  starts spending while the copy is still being edited. Drafts 404 publicly.
- **Slug and code mode are immutable** once created — links and printed codes
  are already in the wild.

## Two code modes

- **Shared** — one booth code (`AISA-AGENTS-SF-7K3M`), redeemable until the cap.
- **Single-use** — a pre-generated batch, for when the code must not escape
  the room and drain the budget onto a coupon aggregator.

Codes use a Crockford-ish alphabet (no `I/L/O/U/0/1`) so a code read off a
slide from the back of a room doesn't become a support ticket.

## Running it

```bash
npm install
npm run dev     # http://localhost:4040
```

State lives in `.data/db.json` (gitignored), seeded on first read. Swap
`lib/store.ts` for the real billing service to productionise — the module
boundary is the whole integration surface.
