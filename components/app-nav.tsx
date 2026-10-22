"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS } from "./nav-items";

const isActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

// Sidebar navigation (desktop). Highlights the current section.
// The current URL is only known at request time, so the layout renders
// this inside <Suspense> with SidebarNavView (no highlight) as fallback.
export function SidebarNav() {
  return <SidebarNavView pathname={usePathname()} />;
}

export function SidebarNavView({ pathname }: { pathname: string }) {
  return (
    <nav className="flex-1 space-y-6 px-3 py-4">
      {NAV_SECTIONS.map((section, i) => (
        <div key={i} className="space-y-1">
          {section.title && (
            <p className="px-3 pb-1 text-xs font-medium tracking-wide text-sidebar-foreground/60 uppercase">
              {section.title}
            </p>
          )}
          {section.items.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className={cn("size-4", active && "text-sidebar-primary")} />
                {label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

// Compact horizontal navigation for small screens
export function MobileNav() {
  return <MobileNavView pathname={usePathname()} />;
}

export function MobileNavView({ pathname }: { pathname: string }) {
  const items = NAV_SECTIONS.flatMap((s) => s.items);

  return (
    <nav className="flex gap-1 overflow-x-auto px-4 pb-3 md:hidden">
      {items.map(({ href, label }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-sm",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
