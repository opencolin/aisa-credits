import { randomBytes } from "node:crypto";

// Crockford-ish alphabet: no I/L/O/U/0/1, so a code read off a slide at the
// back of a room doesn't turn into a support ticket.
const ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";

function randomChars(length: number): string {
  // rejection-free: 30 divides evenly into the 240 usable byte values, so
  // modulo introduces no bias for this alphabet.
  const bytes = randomBytes(length * 2);
  let out = "";
  for (let i = 0; out.length < length && i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte >= 240) continue;
    out += ALPHABET[byte % ALPHABET.length];
  }
  return out.length === length ? out : out + randomChars(length - out.length);
}

/** Booth-friendly shared code, e.g. "AISA-KUBECON-7F3K". */
export function sharedCodeFor(slug: string): string {
  const stem = slug.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 14);
  return `AISA-${stem || "EVENT"}-${randomChars(4)}`;
}

/** Single-use code, e.g. "AISA-9K2M-XQ4T". */
export function uniqueCode(): string {
  return `AISA-${randomChars(4)}-${randomChars(4)}`;
}

export function uniqueCodeBatch(count: number): string[] {
  const set = new Set<string>();
  while (set.size < count) set.add(uniqueCode());
  return [...set];
}
