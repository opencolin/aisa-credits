import Link from "next/link";

export default function NotFound() {
  return (
    <main className="theme-light bg-bg text-fg flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="eyebrow text-brand">404</p>
      <h1 className="text-4xl">No such event page.</h1>
      <p className="text-fg-muted max-w-md">
        The link may have expired, or the page hasn&apos;t been activated yet.
      </p>
      <Link href="/console/events" className="bg-brand rounded-full px-5 py-2.5 text-sm font-semibold text-white">
        Go to the console
      </Link>
    </main>
  );
}
