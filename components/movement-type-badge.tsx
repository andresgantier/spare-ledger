import { ArrowDownLeft, ArrowUpRight, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export type MovementType = "RECEIPT" | "ISSUE" | "ADJUSTMENT";

const STYLES: Record<MovementType, { label: string; className: string; icon: typeof ArrowDownLeft }> = {
  RECEIPT: { label: "Receipt", className: "bg-status-green/12 text-[oklch(0.42_0.11_150)]", icon: ArrowDownLeft },
  ISSUE: { label: "Issue", className: "bg-primary/10 text-primary", icon: ArrowUpRight },
  ADJUSTMENT: { label: "Adjustment", className: "bg-status-yellow/20 text-[oklch(0.45_0.1_70)]", icon: SlidersHorizontal },
};

export function MovementTypeBadge({ type }: { type: MovementType }) {
  const style = STYLES[type];
  const Icon = style.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium", style.className)}>
      <Icon className="size-3" />
      {style.label}
    </span>
  );
}
