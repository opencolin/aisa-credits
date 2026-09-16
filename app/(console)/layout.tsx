import { ConsoleSidebar } from "./_components/sidebar";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-dark bg-bg text-fg min-h-dvh">
      {/* Covers overscroll so the light root background never flashes through. */}
      <div className="bg-bg fixed inset-0 -z-10" />
      <div className="flex min-h-dvh">
        <ConsoleSidebar />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
