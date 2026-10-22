import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { AlertTriangle, ArrowRight, Clock, Euro, ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { LoadError } from "@/components/list-parts";
import { MovementsTable } from "@/components/movements-table";
import { MonthlyConsumptionChart, type MonthlyPoint } from "@/components/charts/monthly-consumption-chart";
import { TopConsumptionChart, type TopItem } from "@/components/charts/top-consumption-chart";
import { StatusBadge } from "@/components/stock-status";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { daysOfCover, formatDaysAgo, formatEur, formatInt, formatQty } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { MaterialStatusRow, MovementHistoryRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" description="Inventory health at a glance. All figures are calculated live from the movement ledger." />
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </>
  );
}

type Kpis = {
  total_inventory_value: number;
  red_count: number;
  yellow_count: number;
  green_count: number;
  slow_moving_count: number;
  slow_moving_value: number;
  active_materials: number;
};

const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit" });

async function Dashboard() {
  // Live data: always read at request time, never prerendered
  await connection();
  const supabase = await createClient();

  const [kpis, monthly, top, status, latest] = await Promise.all([
    supabase.from("v_dashboard_kpis").select("*").single(),
    supabase.from("v_monthly_consumption").select("*").order("month"),
    supabase.from("v_top_consumption_90d").select("*"),
    supabase.from("v_material_status").select("*").eq("is_active", true),
    supabase.from("v_movement_history").select("*").order("movement_date", { ascending: false }).order("id", { ascending: false }).limit(8),
  ]);
  const failed = [kpis, monthly, top, status, latest].find((r) => r.error);
  if (failed?.error) return <LoadError message={failed.error.message} />;

  const k = kpis.data as Kpis;
  const materials = (status.data ?? []) as MaterialStatusRow[];

  // Current month is still running: flag it in the chart
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyData: MonthlyPoint[] = (monthly.data ?? []).map((m) => ({
    month: m.month,
    label: monthLabel.format(new Date(`${m.month}T12:00:00`)),
    value: Number(m.issued_value),
    issues: Number(m.issue_count),
    partial: String(m.month).startsWith(thisMonth),
  }));

  const topData: TopItem[] = (top.data ?? []).map((t) => ({
    code: t.code,
    description: t.description,
    value: Number(t.issued_value_90d),
    quantity: Number(t.issued_qty_90d),
    uom: t.uom_code,
  }));

  // Needs attention: critical first, then the least days of cover
  const attention = materials
    .filter((m) => m.stock_status !== "GREEN")
    .sort(
      (a, b) =>
        (a.stock_status === "RED" ? 0 : 1) - (b.stock_status === "RED" ? 0 : 1) ||
        (daysOfCover(a.stock_qty, a.avg_daily_consumption) ?? 9999) - (daysOfCover(b.stock_qty, b.avg_daily_consumption) ?? 9999)
    )
    .slice(0, 8);

  // Slow movers with stock, by tied-up value
  const slow = materials
    .filter((m) => m.is_slow_moving && Number(m.stock_qty) > 0)
    .sort((a, b) => Number(b.stock_value) - Number(a.stock_value))
    .slice(0, 6);

  const latestRows = (latest.data ?? []) as MovementHistoryRow[];

  return (
    <>
      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          href="/stock"
          icon={Euro}
          label="Inventory value"
          value={formatEur(k.total_inventory_value)}
          note={`${formatInt(k.active_materials)} active materials`}
        />
        <KpiTile
          href="/stock?status=RED"
          icon={AlertTriangle}
          label="Critical"
          value={formatInt(k.red_count)}
          note="At or below safety stock"
          dot="bg-status-red"
        />
        <KpiTile
          href="/stock?status=YELLOW"
          icon={ShoppingCart}
          label="Reorder now"
          value={formatInt(k.yellow_count)}
          note="At or below the reorder point"
          dot="bg-status-yellow"
        />
        <KpiTile
          href="/stock?slow=on"
          icon={Clock}
          label="Tied-up capital"
          value={formatEur(k.slow_moving_value)}
          note={`${formatInt(k.slow_moving_count)} materials without movement in 90+ days`}
        />
      </div>

      {/* Monthly consumption + needs attention */}
      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Monthly consumption</CardTitle>
            <CardDescription>Value of spare parts issued to machines per month (current month lighter: still running)</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? <Empty text="No issues in the last 12 months." /> : <MonthlyConsumptionChart data={monthlyData} />}
          </CardContent>
        </Card>

        <Card className="gap-4 xl:col-span-2">
          <CardHeader>
            <CardTitle>Needs attention</CardTitle>
            <CardDescription>Critical and reorder items, shortest cover first</CardDescription>
            <CardAction>
              <SeeAll href="/stock?status=RED" />
            </CardAction>
          </CardHeader>
          <CardContent className="px-0">
            {attention.length === 0 ? (
              <Empty text="Nothing to reorder. All materials are above their reorder point." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Material</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="pr-6 text-right">Cover</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attention.map((m) => {
                    const cover = daysOfCover(m.stock_qty, m.avg_daily_consumption);
                    return (
                      <TableRow key={m.material_id}>
                        <TableCell className="max-w-56 truncate pl-6" title={m.description}>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={m.stock_status} />
                            <Link href={`/stock/${m.material_id}`} className="font-mono text-xs font-medium text-primary hover:underline">
                              {m.code}
                            </Link>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQty(m.stock_qty)} <span className="text-xs text-muted-foreground">{m.uom_code}</span>
                        </TableCell>
                        <TableCell className={cn("pr-6 text-right tabular-nums", cover !== null && cover < m.lead_time_days && "font-medium text-destructive")}>
                          {cover === null ? "–" : `${cover} d`}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top consumption + slow movers */}
      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Top 10 consumption</CardTitle>
            <CardDescription>Materials with the highest issued value, last 90 days</CardDescription>
          </CardHeader>
          <CardContent>
            {topData.length === 0 ? <Empty text="No issues in the last 90 days." /> : <TopConsumptionChart data={topData} />}
          </CardContent>
        </Card>

        <Card className="gap-4 xl:col-span-2">
          <CardHeader>
            <CardTitle>Slow movers</CardTitle>
            <CardDescription>No movement in 90+ days, highest value first</CardDescription>
            <CardAction>
              <SeeAll href="/stock?slow=on" />
            </CardAction>
          </CardHeader>
          <CardContent className="px-0">
            {slow.length === 0 ? (
              <Empty text="No slow-moving stock." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Material</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="pr-6">Last movement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slow.map((m) => (
                    <TableRow key={m.material_id}>
                      <TableCell className="max-w-48 truncate pl-6" title={m.description}>
                        <Link href={`/stock/${m.material_id}`} className="font-mono text-xs font-medium text-primary hover:underline">
                          {m.code}
                        </Link>{" "}
                        <span className="text-muted-foreground">{m.description}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatEur(m.stock_value)}</TableCell>
                      <TableCell className="pr-6 text-muted-foreground">{formatDaysAgo(m.days_since_last_movement)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Latest movements */}
      <Card className="gap-4 pb-0">
        <CardHeader>
          <CardTitle>Latest movements</CardTitle>
          <CardDescription>The last entries in the ledger</CardDescription>
          <CardAction>
            <SeeAll href="/movements" label="Record a movement" />
          </CardAction>
        </CardHeader>
        <CardContent className="border-t px-0">
          <MovementsTable rows={latestRows} />
        </CardContent>
      </Card>
    </>
  );
}

function KpiTile({
  href,
  icon: Icon,
  label,
  value,
  note,
  dot,
}: {
  href: string;
  icon: typeof Euro;
  label: string;
  value: string;
  note: string;
  dot?: string;
}) {
  return (
    <Link href={href} className="group">
      <Card className="h-full gap-2 transition-colors group-hover:border-primary/40">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            {dot ? <span className={cn("size-2 rounded-full", dot)} /> : <Icon className="size-4" />}
            {label}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{note}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function SeeAll({ href, label = "See all" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
      {label}
      <ArrowRight className="size-3.5" />
    </Link>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-6 py-10 text-center text-sm text-muted-foreground">{text}</p>;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-5">
        <Skeleton className="h-80 rounded-xl xl:col-span-3" />
        <Skeleton className="h-80 rounded-xl xl:col-span-2" />
      </div>
    </div>
  );
}
