"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AisaLogo } from "~/components/logo";
import {
  ArrowRightIcon,
  BookIcon,
  CardIcon,
  ChartIcon,
  ChatIcon,
  GaugeIcon,
  GiftIcon,
  KeyIcon,
  MailIcon,
  PlayIcon,
  TicketIcon,
} from "~/components/icons";

type Item = {
  label: string;
  sub?: string;
  href: string;
  icon: (p: { className?: string }) => React.ReactElement;
};

// Mirrors the live console's information architecture; Event Pages is added
// under a Growth group so promo tooling sits beside the balances it spends.
const GROUPS: { title: string; items: Item[] }[] = [
  { title: "Overview", items: [{ label: "Dashboard", sub: "Metrics & health", href: "#", icon: GaugeIcon }] },
  {
    title: "Build",
    items: [
      { label: "Get Started", sub: "Setup guide", href: "#", icon: ArrowRightIcon },
      { label: "API Keys", sub: "Keys & limits", href: "#", icon: KeyIcon },
      { label: "Playground", sub: "Test models", href: "#", icon: PlayIcon },
    ],
  },
  { title: "Monitor", items: [{ label: "Usage & Logs", sub: "Requests & cost", href: "#", icon: ChartIcon }] },
  {
    title: "Billing & rewards",
    items: [
      { label: "Billing", sub: "Balance & top-up", href: "/console/billing", icon: CardIcon },
      { label: "GTM Rewards", sub: "Referrals & payouts", href: "#", icon: GiftIcon },
    ],
  },
  {
    title: "Growth",
    items: [{ label: "Event Pages", sub: "Codes & credits", href: "/console/events", icon: TicketIcon }],
  },
  {
    title: "Help",
    items: [
      { label: "Docs", href: "#", icon: BookIcon },
      { label: "Support", href: "#", icon: MailIcon },
      { label: "Discord", href: "#", icon: ChatIcon },
    ],
  },
];

export function ConsoleSidebar() {
  const pathname = usePathname();

  return (
    <aside className="console-sidebar border-line hidden w-[252px] shrink-0 flex-col border-r lg:flex">
      <div className="border-line flex h-16 items-center border-b px-6">
        <AisaLogo />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {GROUPS.map((group) => (
          <div key={group.title} className="mb-5">
            <p className="eyebrow px-3 pb-2">{group.title}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.href !== "#" && pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                      active
                        ? "bg-brand-tint ring-brand/40 text-fg ring-1"
                        : "text-fg-muted hover:bg-surface hover:text-fg"
                    }`}
                  >
                    <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-brand" : "text-fg-subtle"}`} />
                    <span className="min-w-0">
                      <span className={`block truncate text-sm font-semibold ${active ? "text-fg" : ""}`}>
                        {item.label}
                      </span>
                      {item.sub && <span className="text-fg-subtle block truncate text-[11px]">{item.sub}</span>}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-line border-t p-3">
        <div className="bg-surface flex items-center gap-3 rounded-xl p-3">
          <span className="bg-surface-2 text-fg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            CL
          </span>
          <span className="min-w-0">
            <span className="text-fg block truncate text-sm font-semibold">Colin Lowenberg</span>
            <span className="text-fg-subtle block truncate text-[11px]">demo@aisa.one</span>
          </span>
        </div>
      </div>
    </aside>
  );
}
