import { NextResponse } from "next/server";

import { CODE_PATTERN } from "~/lib/format";
import { redeemCode } from "~/lib/store";

/**
 * POST /api/redeem  { code, email }
 *
 * The single place credits are granted. Both the signup flow (?event=slug)
 * and the console's Claim box land here, so the budget cap and the
 * one-per-account rule can't be bypassed by using the other door.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "Expected a JSON body." }, { status: 400 });
  }

  const { code, email } = (body ?? {}) as { code?: unknown; email?: unknown };

  if (typeof code !== "string" || !CODE_PATTERN.test(code.trim().toUpperCase())) {
    return NextResponse.json({ ok: false, reason: "That code isn't recognised." }, { status: 400 });
  }
  if (typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
    return NextResponse.json({ ok: false, reason: "Enter the email on your Aisa account." }, { status: 400 });
  }

  const result = await redeemCode(code, email);
  // A rejected code is a normal outcome, not a server fault — 200 with
  // ok:false keeps the client from treating it as an outage.
  return NextResponse.json(result);
}
