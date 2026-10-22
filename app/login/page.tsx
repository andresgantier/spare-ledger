import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      {/* Left: product context (hidden on small screens) */}
      <section className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <Logo inverted className="text-sidebar-accent-foreground" />
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight text-sidebar-accent-foreground">
            Spare parts inventory for maintenance teams
          </h1>
          <p className="text-sm leading-relaxed">
            Every receipt, issue and adjustment is recorded in a ledger. Stock is
            calculated, never typed in. Reorder points and a traffic light flag
            shortages before a machine stops.
          </p>
        </div>
        <p className="text-xs">Vossberg Antriebstechnik GmbH · Maintenance warehouse</p>
      </section>

      {/* Right: sign-in form */}
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <Logo className="lg:hidden" />
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground">
              Use your account or explore the demo.
            </p>
          </div>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
