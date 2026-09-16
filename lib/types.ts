export type EventStatus = "draft" | "active" | "ended";

/**
 * How codes are issued for an event.
 *
 * - "shared": one code printed on the booth banner / slide, redeemable by
 *   anyone until the budget cap is hit.
 * - "unique": a pre-generated batch of single-use codes, handed out
 *   individually. Use when the budget must not be drained by a code that
 *   escapes onto a coupon aggregator.
 */
export type CodeMode = "shared" | "unique";

export type EventPromo = {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: EventStatus;
  codeMode: CodeMode;
  /** Present only when codeMode === "shared". */
  sharedCode: string | null;
  creditCents: number;
  budgetCapCents: number;
  grantedCents: number;
  grantCount: number;
  /** null = credits never expire. */
  expiryDays: number | null;
  createdAt: string;
  activatedAt: string | null;
  endedAt: string | null;
};

export type UniqueCode = {
  code: string;
  eventId: string;
  redeemedAt: string | null;
  redeemedBy: string | null;
};

export type Redemption = {
  id: string;
  eventId: string;
  code: string;
  email: string;
  amountCents: number;
  createdAt: string;
  expiresAt: string | null;
};

export type Db = {
  events: EventPromo[];
  uniqueCodes: UniqueCode[];
  redemptions: Redemption[];
};

/**
 * What the public landing page is allowed to say.
 *
 * `offerLive` is deliberately narrower than `status === "active"`: an event
 * whose remaining budget can no longer cover one grant must stop advertising
 * credits immediately, or the page sends people to a signup that silently
 * gives them nothing.
 */
export type PublicEvent = {
  slug: string;
  title: string;
  description: string;
  creditCents: number;
  codeMode: CodeMode;
  sharedCode: string | null;
  expiryDays: number | null;
  offerLive: boolean;
  remainingCents: number;
};
