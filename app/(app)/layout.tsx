import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { MobileNav, MobileNavView, SidebarNav, SidebarNavView } from "@/components/app-nav";
import { UserMenu, UserMenuSkeleton } from "@/components/user-menu";

// Shell for every signed-in page: sidebar on desktop, top bar on mobile.
// proxy.ts already guarantees a session before any of these pages render.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <Link href="/dashboard" className="px-6 pt-6 pb-2 text-sidebar-accent-foreground">
          <Logo inverted />
        </Link>
        <Suspense fallback={<SidebarNavView pathname="" />}>
          <SidebarNav />
        </Suspense>
        <div className="border-t border-sidebar-border p-4">
          <Suspense fallback={<UserMenuSkeleton />}>
            <UserMenu />
          </Suspense>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b bg-card md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/dashboard">
              <Logo />
            </Link>
            <Suspense fallback={<UserMenuSkeleton variant="header" />}>
              <UserMenu variant="header" />
            </Suspense>
          </div>
          <Suspense fallback={<MobileNavView pathname="" />}>
            <MobileNav />
          </Suspense>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
