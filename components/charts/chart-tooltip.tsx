import type { ReactNode } from "react";

// Shared tooltip box for the dashboard charts (text in text colors, never the bar color)
export function ChartTooltipBox({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-foreground">{title}</p>
      <div className="space-y-0.5 text-muted-foreground">{children}</div>
    </div>
  );
}
