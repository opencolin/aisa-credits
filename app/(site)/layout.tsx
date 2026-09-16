import Link from "next/link";

import { AisaLogo } from "~/components/logo";

const NAV = ["Capabilities", "Solutions", "Resources", "Pricing", "Contact"];

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-light bg-bg text-fg min-h-dvh">
      <div className="bg-fg text-bg flex items-center justify-center gap-3 px-4 py-2.5 text-[13px]">
        <span className="bg-brand rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-[0.1em] text-white">
          EVENTS
        </span>
        <span className="opacity-90">Meet us at an event and start with credits already on your key.</span>
      </div>

      <header className="border-line bg-bg/80 sticky top-0 z-40 border-b backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-5">
          <Link href="/">
            <AisaLogo />
          </Link>
          <nav className="text-fg-muted hidden items-center gap-7 text-sm font-medium lg:flex">
            {NAV.map((item) => (
              <span key={item} className="hover:text-fg cursor-default transition-colors">
                {item}
              </span>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-fg-muted hidden text-sm font-medium sm:inline">Console</span>
            <span className="bg-brand hover:bg-brand-hover cursor-default rounded-full px-5 py-2 text-sm font-semibold text-white transition-colors">
              Get started
            </span>
          </div>
        </div>
      </header>

      {children}

      <footer className="border-line mt-24 border-t">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <AisaLogo />
            <p className="text-fg-subtle text-sm">Capability layer for the agentic economy.</p>
          </div>
          <p className="text-fg-subtle text-sm">
            ©2026 Aisa · Terms of Service · Privacy Policy
          </p>
        </div>
      </footer>
    </div>
  );
}
