import Link from "next/link";

export function SiteHeader({ active }: { active: "dashboard" | "queue" }) {
  const link = (href: string, label: string, key: string) => (
    <Link
      href={href}
      className={
        key === active
          ? "text-foreground border-foreground border-b-2 pb-3 text-sm font-medium"
          : "text-muted-foreground hover:text-foreground pb-3 text-sm transition-colors"
      }
    >
      {label}
    </Link>
  );

  return (
    <header className="border-border/60 border-b">
      <div className="mx-auto flex max-w-6xl items-end justify-between px-6 pt-5">
        <div className="pb-3">
          <div className="text-sm font-semibold tracking-tight">
            Greenscape Pro
          </div>
          <div className="text-muted-foreground text-xs">Reactivation agent</div>
        </div>
        <nav className="flex gap-6">
          {link("/", "Dashboard", "dashboard")}
          {link("/queue", "Review queue", "queue")}
        </nav>
      </div>
    </header>
  );
}
