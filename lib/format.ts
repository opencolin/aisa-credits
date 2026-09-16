/** 5000 -> "$50", 2550 -> "$25.50", 100000 -> "$1,000". */
export function formatCredit(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(iso));
}

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      // Drop apostrophes rather than letting them become separators, so
      // "AI Engineer World's Fair" slugs to "…-worlds-fair", not "world-s-fair".
      .replace(/['\u2019]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64)
      // A trailing dash can reappear after the 64-char truncation.
      .replace(/-+$/, "")
  );
}

/** Mirrors the public route's own validation, so junk slugs 404 without a lookup. */
export const SLUG_PATTERN = /^[a-z0-9-]{1,64}$/;

export const CODE_PATTERN = /^[A-Z0-9-]{4,32}$/;
