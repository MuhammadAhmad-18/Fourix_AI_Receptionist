"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Sparkles,
  Stethoscope,
  Boxes,
  Package,
  Banknote,
  UserCog,
  BarChart3,
  Settings,
  Bell,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";

type NavItem = { href: string; label: string; short?: string; icon: LucideIcon };

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Clinic",
    items: [
      { href: "/patients", label: "Patients", icon: Users },
      { href: "/appointments", label: "Appointments", icon: CalendarDays },
      { href: "/services", label: "Services", icon: Sparkles },
      { href: "/practitioners", label: "Practitioners", icon: Stethoscope },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/inventory", label: "Inventory", icon: Boxes },
      {
        href: "/packages",
        label: "Packages & Memberships",
        short: "Packages",
        icon: Package,
      },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/finance", label: "Finance", icon: Banknote },
      { href: "/employees", label: "Employees", icon: UserCog },
      { href: "/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SidebarNav() {
  const isActive = useIsActive();

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <span className="px-3 pb-1.5 text-[0.62rem] font-semibold tracking-[0.2em] text-sidebar-muted/75 uppercase">
            {group.label}
          </span>
          {group.items.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg py-2 pr-3 pl-3.5 text-[0.855rem] transition-colors duration-150",
                  "focus-visible:ring-2 focus-visible:ring-sidebar-ring/70 focus-visible:outline-none",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-muted hover:bg-sidebar-accent/55 hover:text-sidebar-foreground"
                )}
              >
                {/* the blush indicator — the app's signature active state */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-full bg-sidebar-primary transition-opacity duration-150",
                    active ? "opacity-100" : "opacity-0"
                  )}
                />
                <Icon
                  className={cn(
                    "size-[1.05rem] shrink-0 transition-colors",
                    active
                      ? "text-sidebar-primary"
                      : "text-sidebar-muted/70 group-hover:text-sidebar-foreground/80"
                  )}
                />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/** Horizontally scrolling nav strip for narrow screens. */
export function MobileNav() {
  const isActive = useIsActive();
  const items = NAV_GROUPS.flatMap((g) => g.items);

  return (
    <nav className="flex gap-1.5 overflow-x-auto px-4 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map(({ href, label, short, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.8rem] whitespace-nowrap transition-colors",
              active
                ? "border-sidebar-primary/60 bg-sidebar-accent text-sidebar-accent-foreground"
                : "border-sidebar-border/60 text-sidebar-muted hover:text-sidebar-foreground"
            )}
          >
            <Icon className="size-3.5" />
            {short ?? label}
          </Link>
        );
      })}
    </nav>
  );
}
