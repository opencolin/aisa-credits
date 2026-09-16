import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { formatCredit, SLUG_PATTERN } from "~/lib/format";
import { getEventBySlug, toPublicEvent } from "~/lib/store";
import { FaqList, type Faq } from "./_components/faq";
import { PromoCode } from "./_components/promo-code";
import { QrDialog } from "./_components/qr-dialog";

type Props = { params: Promise<{ slug: string }> };

const SITE = "https://aisa.one";

// An operator can end an event, or its budget can run dry, at any moment.
// Revalidate often enough that a dead offer stops advertising credits.
export const revalidate = 60;

async function load(slug: string) {
  if (!SLUG_PATTERN.test(slug)) return null;
  const event = await getEventBySlug(slug);
  // A draft is not yet public — it 404s until an operator activates it.
  if (!event || event.status === "draft") return null;
  return toPublicEvent(event);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await load(slug);
  if (!event) return {};

  const url = `${SITE}/events/${slug}`;
  return {
    title: `${event.title} | Aisa`,
    description: event.description,
    alternates: { canonical: url },
    // An ended offer stays reachable for anyone holding the link, but should
    // not keep collecting search traffic for credits it can't grant.
    robots: event.offerLive ? undefined : { index: false, follow: true },
    openGraph: { title: event.title, description: event.description, url, type: "website", siteName: "Aisa" },
    twitter: { card: "summary_large_image", title: event.title, description: event.description },
  };
}

const STATS = [
  { label: "APIs", value: "5,000+" },
  { label: "Skills", value: "40+" },
  { label: "Models", value: "110+" },
  { label: "Payments", value: "x402" },
];

function steps(live: boolean, credits: string, hasCode: boolean) {
  return [
    {
      title: "Claim your credits",
      body: live
        ? hasCode
          ? `Sign up through this page and ${credits} lands in your promo balance. The code is applied for you — nothing to paste.`
          : `Redeem the code from the booth and ${credits} lands in your promo balance.`
        : "Create an account for free. Pay-as-you-go pricing applies, with hard spend limits on every key.",
      panel: (
        <div className="border-line bg-bg rounded-xl border p-4">
          <p className="eyebrow mb-2">Promo balance</p>
          <p className="font-display text-fg text-3xl font-bold">{live ? credits : "$0.00"}</p>
          <p className="text-fg-subtle mt-2 text-xs">Included in your pay-as-you-go balance</p>
        </div>
      ),
      caption: "then copy…",
    },
    {
      title: "Copy your setup prompt",
      body: "Your console shows a ready-made prompt with your key already inside — nothing to write.",
      panel: (
        <div className="border-line bg-bg rounded-xl border p-4">
          <p className="text-fg-muted font-mono text-[11px] leading-relaxed">
            Read https://aisa.one/docs/agent-quickstart.md and help me safely connect, configure, and use Aisa&apos;s
            APIs, Skills, and LLMs in this agent environment. My Aisa API Key is{" "}
            <span className="text-brand">sk-aisa-Egr••••••6mEY</span>
          </p>
        </div>
      ),
      caption: "now try it!",
    },
    {
      title: "Paste it, then ask",
      body: "Your agent reads the docs, saves the key, and starts calling Aisa. Pick a question and send it.",
      panel: (
        <div className="border-line bg-bg space-y-2 rounded-xl border p-4">
          {[
            "Summarize today's top 3 AI news stories.",
            "Get the current BTC and ETH prices.",
            "Find 5 high-intent keywords for an AI API.",
          ].map((q) => (
            <p key={q} className="text-fg-muted flex gap-2 text-xs leading-relaxed">
              <span className="text-brand shrink-0">›</span>
              {q}
            </p>
          ))}
        </div>
      ),
      caption: null,
    },
  ];
}

function faqs(live: boolean, credits: string, expiryDays: number | null): Faq[] {
  return [
    {
      question: "What can I spend my credits on?",
      answer:
        "Everything one Aisa key reaches: 5,000+ live APIs, 40+ ready-made skills, and 110+ models. Every call is metered and itemised, so you decide the split as you go — there is no per-product allocation to pick up front.",
    },
    {
      question: "Do I need to enter the code myself?",
      answer:
        "Not if you sign up through this page — the code rides along with your registration and the credits are on your balance before you reach the console. If you signed up earlier, paste the code into Billing → Promo balance → Claim and it applies to the same account.",
    },
    {
      question: "How quickly can I start calling APIs?",
      answer:
        "Under a minute, and there is no approval step. Sign in, copy the setup prompt from your console — your key is already in it — paste it to your agent, and ask it something. The agent reads the quickstart, stores the key, and starts making calls.",
    },
    {
      question: "Do my teammates get the credits too?",
      answer:
        "The credits sit on the account that claimed them. Invite teammates to that account and you all draw from the same balance, with per-key spend limits so one agent can't drain it.",
    },
    {
      question: live ? "What happens when the credits run out?" : "Can I still get started?",
      answer: live
        ? "Your key keeps working. Calls fall through to your pay-as-you-go balance at standard per-call rates, and you can cap what any key is allowed to spend. Nothing stops mid-run without you choosing it."
        : "Yes. Create an account and pay per call at standard rates — a median API call is $0.012, and every endpoint shows its exact price before your agent commits.",
    },
    {
      question: "Do I need a credit card?",
      answer:
        "No. Claim through this page and the credits apply automatically. We won't ask for a card or any payment details to get you started.",
    },
    {
      question: "Do you train on my data?",
      answer: "No. Your prompts and outputs are never used for training and never sold.",
    },
    ...(expiryDays
      ? [
          {
            question: "Do these credits expire?",
            answer: `Event credits expire ${expiryDays} days after they're claimed. Anything you've topped up yourself doesn't expire, and your balance spends promotional credits first.`,
          },
        ]
      : []),
  ];
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const event = await load(slug);
  if (!event) notFound();

  const credits = formatCredit(event.creditCents);
  const live = event.offerLive;
  const url = `${SITE}/events/${slug}`;
  // The `event` param is what triggers the grant at signup. An offer that
  // can no longer pay out links to plain registration instead — never send
  // someone to a page promising credits it won't hand over.
  const signupUrl = live ? `https://console.aisa.one/register?event=${slug}` : "https://console.aisa.one/register";

  return (
    <main>
      {/* Hero */}
      <section className="mx-auto max-w-[1180px] px-5 pt-16 pb-14 lg:pt-24">
        <p className="eyebrow text-brand mb-4">{live ? "Event offer" : "Offer ended"}</p>
        <h1 className="max-w-4xl text-[40px] sm:text-[52px] lg:text-[60px]">
          {event.title}
          <br />
          {live ? (
            <span className="text-brand">Get {credits} in free credits.</span>
          ) : (
            <span className="text-fg-subtle">This offer has ended.</span>
          )}
        </h1>

        <p className="text-fg-muted mt-6 max-w-2xl text-lg leading-relaxed">
          {event.description || "5,000+ APIs, skills, and models behind one Aisa key — billed per call, no per-vendor contracts."}
        </p>

        {live && event.sharedCode && (
          <div className="mt-8">
            <PromoCode code={event.sharedCode} />
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href={signupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-brand hover:bg-brand-hover inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-colors"
          >
            {live ? `Claim ${credits} in free credits` : "Get started free"}
            <span aria-hidden="true">→</span>
          </a>
          <span className="border-line bg-surface text-fg cursor-default rounded-full border px-6 py-3 text-sm font-semibold">
            Read the docs
          </span>
          <QrDialog url={url} title={event.title} credits={live ? credits : null} />
        </div>

        <p className="text-fg-subtle mt-4 text-sm">No credit card required</p>
      </section>

      {/* Stat strip — the same four numbers the homepage leads with. */}
      <section className="border-line border-y">
        <div className="divide-line mx-auto grid max-w-[1180px] grid-cols-2 divide-x divide-y md:grid-cols-4 md:divide-y-0">
          {STATS.map((stat) => (
            <div key={stat.label} className="px-5 py-7">
              <p className="font-display text-fg text-3xl font-bold">{stat.value}</p>
              <p className="eyebrow mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-[1180px] px-5 py-20">
        <p className="eyebrow text-brand">How it works</p>
        <h2 className="mt-3 text-[32px] sm:text-[40px]">
          {live ? "Three steps to your first call." : "You can still start for free."}
        </h2>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {steps(live, credits, Boolean(event.sharedCode)).map((step, i) => (
            <div key={step.title} className="relative">
              <div className="border-line bg-surface step-card h-full rounded-2xl border p-6">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <h3 className="text-fg text-xl">{step.title}</h3>
                  <span className="font-display text-brand/25 text-5xl leading-none font-extrabold">{i + 1}</span>
                </div>
                <p className="text-fg-muted mb-5 text-sm leading-relaxed">{step.body}</p>
                {step.panel}
              </div>

              {step.caption && (
                <div className="text-fg-subtle pointer-events-none absolute top-1/2 -right-3 z-10 hidden -translate-y-1/2 lg:block">
                  <span className="bg-bg text-brand rounded-full px-1 text-lg">→</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-fg-subtle mt-10 max-w-4xl text-xs leading-relaxed">
          {live
            ? "Event credits are available only while this offer is active and its credit budget remains. Once promotional credits are spent, standard per-call pricing applies. "
            : "This event's promotional credits are no longer available. Standard per-call pricing applies. "}
          No credit card is required to create an account. By signing up, you agree to Aisa&apos;s Terms of Service and
          Privacy Policy.
        </p>
      </section>

      {/* FAQ */}
      <section className="border-line border-t">
        <div className="mx-auto grid max-w-[1180px] gap-10 px-5 py-20 lg:grid-cols-[320px_1fr]">
          <div>
            <p className="eyebrow text-brand">FAQs</p>
            <h2 className="mt-3 text-[32px]">
              Questions?
              <br />
              Answered.
            </h2>
            <p className="text-fg-muted mt-4 text-sm">
              Everything else lives in the docs — or ask us directly at{" "}
              <span className="text-brand font-medium">developer@aisa.one</span>.
            </p>
          </div>
          <FaqList faqs={faqs(live, credits, event.expiryDays)} />
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-[1180px] px-5">
        <div className="bg-fg relative overflow-hidden rounded-3xl px-8 py-14 sm:px-14">
          <div
            aria-hidden="true"
            className="absolute -top-24 -right-16 h-72 w-72 rounded-full opacity-40 blur-3xl"
            style={{ background: "var(--brand)" }}
          />
          <div className="relative">
            <p className="eyebrow text-brand">{live ? "Event offer" : "Get Aisa"}</p>
            <h2 className="text-bg mt-3 max-w-2xl text-[32px] sm:text-[40px]">
              {live ? (
                <>
                  One key. {credits} on the house.
                  <br />
                  Infinite possibilities.
                </>
              ) : (
                "One key. Infinite possibilities."
              )}
            </h2>
            <p className="text-bg/70 mt-4 max-w-xl text-base">
              Join 250,000+ agents already running on Aisa.
            </p>
            <a
              href={signupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-brand hover:bg-brand-hover mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-colors"
            >
              {live ? `Claim ${credits} in free credits` : "Get started free"}
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
