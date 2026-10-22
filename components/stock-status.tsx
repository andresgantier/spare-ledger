import { cn } from "@/lib/utils";

export type StockStatus = "RED" | "YELLOW" | "GREEN";

export const STATUS_META: Record<StockStatus, { label: string; rule: string; dot: string; badge: string }> = {
  RED: {
    label: "Critical",
    rule: "Stock at or below safety stock",
    dot: "bg-status-red",
    badge: "bg-status-red/12 text-[oklch(0.48_0.19_27)]",
  },
  YELLOW: {
    label: "Reorder",
    rule: "Stock at or below the reorder point",
    dot: "bg-status-yellow",
    badge: "bg-status-yellow/25 text-[oklch(0.45_0.1_70)]",
  },
  GREEN: {
    label: "OK",
    rule: "Stock above the reorder point",
    dot: "bg-status-green",
    badge: "bg-status-green/12 text-[oklch(0.42_0.11_150)]",
  },
};

// Traffic-light status of a material
export function StatusBadge({ status, className }: { status: StockStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium", meta.badge, className)}>
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}
