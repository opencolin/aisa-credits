"use server";

import { revalidatePath } from "next/cache";

import { slugify, SLUG_PATTERN } from "~/lib/format";
import { createEvent, updateEvent } from "~/lib/store";

export type ActionState = { error?: string; ok?: boolean };

/** "25", "25.00", "$1,000" -> cents. Returns null when it isn't money. */
function parseMoneyToCents(raw: FormDataEntryValue | null): number | null {
  const text = String(raw ?? "").replace(/[$,\s]/g, "");
  if (!text) return null;
  const value = Number(text);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export async function createEventAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Give the event a title." };

  const slug = slugify(String(formData.get("slug") ?? "") || title);
  if (!SLUG_PATTERN.test(slug)) return { error: "Slug must be lowercase letters, numbers and dashes." };

  const creditCents = parseMoneyToCents(formData.get("creditCents"));
  if (creditCents === null || creditCents <= 0) return { error: "Credit per signup must be more than $0." };

  const budgetCapCents = parseMoneyToCents(formData.get("budgetCapCents"));
  if (budgetCapCents === null || budgetCapCents <= 0) return { error: "Budget cap must be more than $0." };

  // A cap below one grant can never pay anybody — reject it at creation
  // rather than shipping a page that 404s its own offer on day one.
  if (budgetCapCents < creditCents) return { error: "Budget cap must cover at least one signup." };

  const expiryRaw = String(formData.get("expiryDays") ?? "").trim();
  const expiryDays = expiryRaw === "" ? null : Number(expiryRaw);
  if (expiryDays !== null && (!Number.isInteger(expiryDays) || expiryDays <= 0)) {
    return { error: "Credit expiry must be a whole number of days, or empty for never." };
  }

  const codeMode = String(formData.get("codeMode") ?? "shared") === "unique" ? "unique" : "shared";
  const uniqueCodeCount = Number(String(formData.get("uniqueCodeCount") ?? "100"));
  if (codeMode === "unique" && (!Number.isInteger(uniqueCodeCount) || uniqueCodeCount < 1 || uniqueCodeCount > 5000)) {
    return { error: "Generate between 1 and 5,000 single-use codes." };
  }

  try {
    await createEvent({
      title,
      slug,
      description: String(formData.get("description") ?? "").trim(),
      creditCents,
      budgetCapCents,
      expiryDays,
      codeMode,
      uniqueCodeCount,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create the event page." };
  }

  revalidatePath("/console/events");
  return { ok: true };
}

export async function setStatusAction(id: string, status: "draft" | "active" | "ended") {
  await updateEvent(id, { status });
  revalidatePath("/console/events");
  revalidatePath(`/console/events/${id}`);
}

export async function updateEventAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const creditCents = parseMoneyToCents(formData.get("creditCents"));
  const budgetCapCents = parseMoneyToCents(formData.get("budgetCapCents"));
  if (creditCents === null || creditCents <= 0) return { error: "Credit per signup must be more than $0." };
  if (budgetCapCents === null || budgetCapCents <= 0) return { error: "Budget cap must be more than $0." };

  const expiryRaw = String(formData.get("expiryDays") ?? "").trim();
  const expiryDays = expiryRaw === "" ? null : Number(expiryRaw);
  if (expiryDays !== null && (!Number.isInteger(expiryDays) || expiryDays <= 0)) {
    return { error: "Credit expiry must be a whole number of days, or empty for never." };
  }

  try {
    await updateEvent(id, {
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      creditCents,
      budgetCapCents,
      expiryDays,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save." };
  }

  revalidatePath("/console/events");
  revalidatePath(`/console/events/${id}`);
  return { ok: true };
}
