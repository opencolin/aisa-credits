"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { EventPromo } from "~/lib/types";
import { updateEventAction, type ActionState } from "../../actions";

export function SettingsForm({ event }: { event: EventPromo }) {
  const [state, action] = useActionState<ActionState, FormData>(updateEventAction, {});

  return (
    <section className="border-line bg-surface rounded-xl border p-6">
      <h2 className="text-fg text-xl">Settings</h2>
      <p className="text-fg-muted mt-1.5 mb-4 text-sm">
        The slug and code mode are fixed once created — links and printed codes are already in the wild.
      </p>

      <form action={action} className="space-y-4">
        <input type="hidden" name="id" value={event.id} />

        <Field label="Title">
          <input name="title" defaultValue={event.title} className={input} />
        </Field>

        <Field label="Description">
          <textarea name="description" rows={3} defaultValue={event.description} className={`${input} resize-y py-2`} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Credit per signup ($)">
            <input name="creditCents" defaultValue={(event.creditCents / 100).toFixed(2)} className={input} />
          </Field>
          <Field label="Budget cap ($)">
            <input name="budgetCapCents" defaultValue={(event.budgetCapCents / 100).toFixed(2)} className={input} />
          </Field>
        </div>

        <Field label="Credit expiry (days)">
          <input name="expiryDays" defaultValue={event.expiryDays ?? ""} placeholder="empty = never" className={input} />
        </Field>

        {state.error && (
          <p className="border-danger/40 bg-danger/10 text-danger rounded-lg border px-3 py-2 text-sm">{state.error}</p>
        )}
        {state.ok && !state.error && <p className="text-positive text-sm">Saved.</p>}

        <Save />
      </form>
    </section>
  );
}

const input =
  "border-line bg-bg text-fg placeholder:text-fg-subtle focus:border-brand h-10 w-full rounded-lg border px-3 text-sm outline-none transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-fg mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}

function Save() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-brand hover:bg-brand-hover rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}
