import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowDownLeft, ArrowUpRight, Pencil, SlidersHorizontal } from "lucide-react";
import { BackLink, FormSkeleton, ListCard, LoadError } from "@/components/list-parts";
import { MovementsTable } from "@/components/movements-table";
import { StatusBadge } from "@/components/stock-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { daysOfCover, formatDaysAgo, formatEur, formatQty } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { MaterialStatusRow, MovementHistoryRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Material history" };

export default function MaterialStockPage({ params }: PageProps<"/stock/[id]">) {
  return (
    <>
      <BackLink href="/stock" label="Stock" />
      <Suspense fallback={<FormSkeleton />}>
        <MaterialStock params={params} />
      </Suspense>
    </>
  );
}

async function MaterialStock({ params }: { params: PageProps<"/stock/[id]">["params"] }) {
  await connection();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const supabase = await createClient();
  const [status, history] = await Promise.all([
    supabase.from("v_material_status").select("*").eq("material_id", id).maybeSingle(),
    supabase
      .from("v_movement_history")
      .select("*")
      .eq("material_id", id)
      .order("movement_date", { ascending: true })
      .order("id", { ascending: true }),
  ]);
  if (status.error) return <LoadError message={status.error.message} />;
  if (history.error) return <LoadError message={history.error.message} />;
  if (!status.data) notFound();

  const m = status.data as MaterialStatusRow;
  const ledger = (history.data ?? []) as MovementHistoryRow[];

  // Running balance: the ledger, summed in date order, ends at the current stock
  const balances = new Map<number, number>();
  let running = 0;
  for (const row of ledger) {
    running += Number(row.quantity);
    balances.set(row.id, running);
  }
  const newestFirst = [...ledger].reverse();

  const cover = daysOfCover(m.stock_qty, m.avg_daily_consumption);
  const daily = Number(m.avg_daily_consumption);

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-2xl font-semibold tracking-tight">{m.code}</h1>
            {m.is_active ? <StatusBadge status={m.stock_status} /> : <Badge variant="muted">Inactive</Badge>}
            {m.is_slow_moving && <Badge variant="outline">No movement in 90+ days</Badge>}
          </div>
          <p className="text-muted-foreground">{m.description}</p>
          <p className="text-sm text-muted-foreground">
            {m.category_name} · Location <span className="font-mono text-xs">{m.location_code}</span> · {m.supplier_name} ·
            Lead time {m.lead_time_days} d · {formatEur(m.unit_cost)} / {m.uom_code}
          </p>
        </div>
        {m.is_active && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <Link href={`/movements?type=issue&material=${m.material_id}`}><ArrowUpRight />Issue</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/movements?type=receipt&material=${m.material_id}`}><ArrowDownLeft />Receipt</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/movements?type=adjustment&material=${m.material_id}`}><SlidersHorizontal />Adjust</Link>
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <Link href={`/materials/${m.material_id}`}><Pencil />Master data</Link>
            </Button>
          </div>
        )}
      </div>

      {/* Key figures */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Current stock" value={`${formatQty(m.stock_qty)} ${m.uom_code}`} note="Sum of all movements" strong />
        <Kpi label="Safety stock" value={formatQty(m.safety_stock)} note="Red at or below" />
        <Kpi
          label="Reorder point"
          value={formatQty(m.reorder_point)}
          note={`${daily.toFixed(2)}/day × ${m.lead_time_days} d + ${formatQty(m.safety_stock)}`}
        />
        <Kpi
          label="Days of cover"
          value={cover === null ? "No use" : `${cover} d`}
          note={cover !== null && cover < m.lead_time_days ? "Runs out before a delivery" : "At current daily use"}
          alert={cover !== null && cover < m.lead_time_days}
        />
        <Kpi label="Stock value" value={formatEur(m.stock_value)} note={`${formatQty(m.issued_qty_90d)} issued in 90 days`} />
        <Kpi label="Last movement" value={formatDaysAgo(m.days_since_last_movement)} note={`${ledger.length} movements in total`} />
      </div>

      {/* Ledger */}
      <h2 className="pt-2 text-lg font-semibold tracking-tight">Movement history</h2>
      <ListCard count={ledger.length} noun="movement">
        {ledger.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No movements yet. Record a receipt or an opening balance to start.
          </p>
        ) : (
          <MovementsTable rows={newestFirst} showMaterial={false} balances={balances} />
        )}
      </ListCard>
    </>
  );
}

function Kpi({
  label,
  value,
  note,
  strong,
  alert,
}: {
  label: string;
  value: string;
  note: string;
  strong?: boolean;
  alert?: boolean;
}) {
  return (
    <Card className="gap-1 py-4">
      <CardHeader className="px-4">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1 px-4">
        <CardTitle className={cn("text-xl tabular-nums", strong && "text-2xl", alert && "text-destructive")}>{value}</CardTitle>
        <p className={cn("text-xs text-muted-foreground", alert && "text-destructive")}>{note}</p>
      </CardContent>
    </Card>
  );
}
