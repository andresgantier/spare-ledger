"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS } from "./nav-items";

// Sidebar navigation (desktop). Highlights the current section.
export function SidebarNav() {
  const pathname = usePathname();

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
            const active = pathname === href || pathname.startsWith(`${href}/`);
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
  const pathname = usePathname();
  const items = NAV_SECTIONS.flatMap((s) => s.items);

  return (
    <nav className="flex gap-1 overflow-x-auto px-4 pb-3 md:hidden">
      {items.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
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
