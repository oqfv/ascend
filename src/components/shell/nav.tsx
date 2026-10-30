"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, CheckCircle2, ListChecks, NotebookPen, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

// Destinations that exist today. Routines, goals and achievements join this list when they ship.
export const NAV = [
  { href: "/today", label: "Today", icon: CheckCircle2 },
  { href: "/habits", label: "My habits", icon: ListChecks },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/reviews", label: "Reviews", icon: NotebookPen },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
] as const;

export const SETTINGS = { href: "/settings", label: "Settings", icon: Settings } as const;

export function NavLink({
  href,
  label,
  icon: Icon,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-muted-foreground transition-colors hover:bg-sidebar-accent/70 hover:text-foreground",
        active && "bg-sidebar-accent text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {label}
    </Link>
  );
}

export function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="flex flex-1 flex-col gap-0.5">
      {NAV.map((item) => (
        <NavLink key={item.href} {...item} onNavigate={onNavigate} />
      ))}
      <div className="mt-auto pt-4">
        <NavLink {...SETTINGS} onNavigate={onNavigate} />
      </div>
    </nav>
  );
}
