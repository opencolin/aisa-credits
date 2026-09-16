"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { slugify } from "~/lib/format";
import { createEventAction, type ActionState } from "../actions";

export function NewEventDialog({ onClose }: { onClose: () => void }) {
  const [state, action] = useActionState<ActionState, FormData>(createEventAction, {});
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [codeMode, setCodeMode] = useState<"shared" | "unique">("shared");

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-6"
      role="dialog"
      aria-modal="true"
      aria-label="New event page"
      onClick={onClose}
    >
      <div
        className="theme-dark bg-surface border-line my-8 w-full max-w-[560px] rounded-2xl border p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-fg text-2xl">New event page</h2>
            <p className="text-fg-muted mt-1.5 text-sm">
              Creates the event as a draft. Activate it when the page should start granting credits.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-fg-subtle hover:text-fg text-xl">
            ×
          </button>
        </div>

        <form action={action} className="space-y-5">
          <Field label="Title">
            <input
              name="title"
              required
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugEdited) setSlug(slugify(e.target.value));
              }}
              placeholder="KubeCon 2026"
              className={inputClass}
            />
          </Field>

          <Field label="Slug" hint="lowercase-kebab; becomes the public page URL.">
            <div className="flex items-center gap-2">
              <span className="text-fg-subtle shrink-0 font-mono text-xs">aisa.one/events/</span>
              <input
                name="slug"
                value={slug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setSlug(e.target.value);
                }}
                placeholder="kubecon-2026"
                className={`${inputClass} font-mono`}
              />
            </div>
          </Field>

          <Field label="Description" hint="Shown on the public event page.">
            <textarea
              name="description"
              rows={3}
              placeholder="5,000+ APIs, skills, and models behind one Aisa key — billed per call."
              className={`${inputClass} resize-y py-2`}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Credit per signup ($)">
              <input name="creditCents" required inputMode="decimal" placeholder="25.00" className={inputClass} />
            </Field>
            <Field label="Budget cap ($)">
              <input name="budgetCapCents" required inputMode="decimal" placeholder="1000.00" className={inputClass} />
            </Field>
          </div>

          <Field label="Credit expiry (days)" hint="Empty means the credits never expire.">
            <input name="expiryDays" inputMode="numeric" placeholder="180" className={inputClass} />
          </Field>

          <fieldset>
            <legend className="text-fg mb-2 block text-sm font-semibold">Promo code</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <CodeOption
                checked={codeMode === "shared"}
                onSelect={() => setCodeMode("shared")}
                value="shared"
                title="One shared code"
                body="Printed on a slide or banner. Anyone can redeem it until the cap is hit."
              />
              <CodeOption
                checked={codeMode === "unique"}
                onSelect={() => setCodeMode("unique")}
                value="unique"
                title="Single-use codes"
                body="A batch of one-shot codes. Use when the code must not escape the room."
              />
            </div>

            {codeMode === "unique" && (
              <div className="mt-3">
                <Field label="How many codes?" hint="Generated now; export them from the event's Manage screen.">
                  <input name="uniqueCodeCount" inputMode="numeric" defaultValue="100" className={inputClass} />
                </Field>
              </div>
            )}
          </fieldset>

          {state.error && (
            <p className="border-danger/40 bg-danger/10 text-danger rounded-lg border px-3 py-2 text-sm">
              {state.error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="border-line hover:bg-surface-2 text-fg rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <SubmitButton />
          </div>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  "border-line bg-bg text-fg placeholder:text-fg-subtle focus:border-brand h-10 w-full rounded-lg border px-3 text-sm outline-none transition-colors";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-fg mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="text-fg-subtle mt-1.5 block text-xs">{hint}</span>}
    </label>
  );
}

function CodeOption({
  checked,
  onSelect,
  value,
  title,
  body,
}: {
  checked: boolean;
  onSelect: () => void;
  value: string;
  title: string;
  body: string;
}) {
  return (
    <label
      className={`cursor-pointer rounded-xl border p-3.5 transition-colors ${
        checked ? "border-brand bg-brand-tint" : "border-line bg-bg hover:border-line-strong"
      }`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="text-fg text-sm font-semibold">{title}</span>
        <input
          type="radio"
          name="codeMode"
          value={value}
          checked={checked}
          onChange={onSelect}
          className="accent-brand mt-0.5"
        />
      </span>
      <span className="text-fg-muted mt-1.5 block text-xs leading-relaxed">{body}</span>
    </label>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-brand hover:bg-brand-hover rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
    >
      {pending ? "Creating…" : "Create draft"}
    </button>
  );
}
