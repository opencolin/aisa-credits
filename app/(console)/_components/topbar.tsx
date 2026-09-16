export function ConsoleTopbar({ crumb, badge }: { crumb: string; badge?: React.ReactNode }) {
  return (
    <header className="border-line flex h-16 shrink-0 items-center justify-between gap-4 border-b px-6">
      <p className="text-fg-muted truncate text-sm font-medium">
        Aisa Console <span className="text-fg-subtle px-1">/</span>
        <span className="text-fg">{crumb}</span>
      </p>
      <div className="flex items-center gap-3">
        {badge}
        <span className="border-line text-fg-muted hidden rounded-lg border px-3 py-1.5 text-xs font-medium sm:inline">
          EN
        </span>
      </div>
    </header>
  );
}
