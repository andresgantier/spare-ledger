import { cn } from "@/lib/utils";

// Simple wordmark: a ledger "book" with a stock line
export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex size-8 items-center justify-center rounded-md",
          inverted ? "bg-sidebar-primary text-sidebar-primary-foreground" : "bg-primary text-primary-foreground"
        )}
      >
        <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 5h16M4 12h10M4 19h6" />
        </svg>
      </div>
      <span className="text-base font-semibold tracking-tight">SpareLedger</span>
    </div>
  );
}
