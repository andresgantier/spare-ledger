import Link from "next/link";
import { MovementTypeBadge } from "@/components/movement-type-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatSignedQty } from "@/lib/format";
import type { MovementHistoryRow } from "@/lib/types";
import { cn } from "@/lib/utils";

// Ledger rows: what moved, where to / from where, and who recorded it
export function MovementsTable({
  rows,
  showMaterial = true,
  highlightId,
}: {
  rows: MovementHistoryRow[];
  showMaterial?: boolean;
  highlightId?: number;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Type</TableHead>
          {showMaterial && <TableHead>Material</TableHead>}
          <TableHead className="text-right">Quantity</TableHead>
          <TableHead>Destination / source / reason</TableHead>
          <TableHead>Reference</TableHead>
          <TableHead>Recorded by</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((m) => (
          <TableRow key={m.id} className={cn(m.id === highlightId && "bg-status-green/10")}>
            <TableCell className="text-muted-foreground tabular-nums">{formatDateTime(m.movement_date)}</TableCell>
            <TableCell><MovementTypeBadge type={m.movement_type} /></TableCell>
            {showMaterial && (
              <TableCell className="max-w-72 truncate" title={m.material_description}>
                <Link href={`/materials/${m.material_id}`} className="font-mono text-xs font-medium text-primary hover:underline">
                  {m.material_code}
                </Link>{" "}
                <span className="text-muted-foreground">{m.material_description}</span>
              </TableCell>
            )}
            <TableCell className={cn("text-right font-medium tabular-nums", Number(m.quantity) < 0 ? "text-foreground" : "text-[oklch(0.42_0.11_150)]")}>
              {formatSignedQty(m.quantity)} <span className="text-xs font-normal text-muted-foreground">{m.uom_code}</span>
            </TableCell>
            <TableCell className="max-w-64 truncate">
              {m.movement_type === "ISSUE" && (
                <span title={`${m.equipment_name} (${m.area_name})`}>
                  {m.equipment_name} <span className="text-muted-foreground">· {m.area_name}</span>
                </span>
              )}
              {m.movement_type === "RECEIPT" && m.supplier_name}
              {m.movement_type === "ADJUSTMENT" && <span title={m.notes ?? undefined}>{m.reason_description}</span>}
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">{m.reference}</TableCell>
            <TableCell className="text-muted-foreground">{m.created_by_name}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
