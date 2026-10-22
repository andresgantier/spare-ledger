import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState, FilterBar, ListCard, ListSkeleton, LoadError } from "@/components/list-parts";
import { STATUS_META, StatusBadge, type StockStatus } from "@/components/stock-status";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cleanSearch, firstParam } from "@/lib/forms";
import { daysOfCover, formatDaysAgo, formatEur, formatQty } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { MaterialStatusRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Stock" };

const STATUSES: StockStatus[] = ["RED", "YELLOW", "GREEN"];
const SEVERITY: Record<StockStatus, number> = { RED: 0, YELLOW: 1, GREEN: 2 };

export default function StockPage({ searchParams }: PageProps<"/stock">) {
  return (
    <>
      <PageHeader
        title="Stock"
        description="Current stock is the sum of all movements. Critical items first."
      />
      <Suspense fallback={<ListSkeleton />}>
        <StockList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function StockList({ searchParams }: { searchParams: PageProps<"/stock">["searchParams"] }) {
  await connection();
  const params = await searchParams;
  const q = cleanSearch(params.q);
  const categoryId = firstParam(params.category) ?? "";
  const locationId = firstParam(params.location) ?? "";
  const slowOnly = firstParam(params.slow) === "on";
  const statusParam = firstParam(params.status);
  const status = STATUSES.includes(statusParam as StockStatus) ? (statusParam as StockStatus) : null;

  const supabase = await createClient();
  let query = supabase.from("v_material_status").select("*").eq("is_active", true);
  if (q) query = query.or(`code.ilike.%${q}%,description.ilike.%${q}%`);
  if (categoryId) query = query.eq("category_id", Number(categoryId));
  if (locationId) query = query.eq("location_id", Number(locationId));
  if (slowOnly) query = query.eq("is_slow_moving", true);

  const [{ data, error }, { data: categories }, { data: locations }] = await Promise.all([
    query,
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("locations").select("id, code").eq("is_active", true).order("code"),
  ]);
  if (error) return <LoadError message={error.message} />;

  // Counts per status for the current filters, then the status filter itself
  const all = (data ?? []) as MaterialStatusRow[];
  const counts = { RED: 0, YELLOW: 0, GREEN: 0 };
  for (const r of all) counts[r.stock_status]++;
  const rows = all
    .filter((r) => !status || r.stock_status === status)
    .sort((a, b) => SEVERITY[a.stock_status] - SEVERITY[b.stock_status] || a.code.localeCompare(b.code));

  // Status pills keep the other filters
  const linkFor = (s: StockStatus | null) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (categoryId) p.set("category", categoryId);
    if (locationId) p.set("location", locationId);
    if (slowOnly) p.set("slow", "on");
    if (s) p.set("status", s);
    const qs = p.toString();
    return qs ? `/stock?${qs}` : "/stock";
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Pill href={linkFor(null)} active={!status}>All <span className="text-muted-foreground">{all.length}</span></Pill>
        {STATUSES.map((s) => (
          <Pill key={s} href={linkFor(s)} active={status === s} title={STATUS_META[s].rule}>
            <span className={cn("size-2 rounded-full", STATUS_META[s].dot)} />
            {STATUS_META[s].label} <span className="text-muted-foreground">{counts[s]}</span>
          </Pill>
        ))}
      </div>

      <FilterBar action="/stock" q={q} placeholder="Search code or description" showInactiveToggle={false}>
        {status && <input type="hidden" name="status" value={status} />}
        <NativeSelect name="category" defaultValue={categoryId} aria-label="Category" className="sm:w-48">
          <option value="">All categories</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </NativeSelect>
        <NativeSelect name="location" defaultValue={locationId} aria-label="Location" className="sm:w-40">
          <option value="">All locations</option>
          {(locations ?? []).map((l) => (
            <option key={l.id} value={l.id}>{l.code}</option>
          ))}
        </NativeSelect>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox name="slow" defaultChecked={slowOnly} />
          No movement in 90+ days
        </label>
      </FilterBar>

      <ListCard count={rows.length} noun="material">
        {rows.length === 0 ? (
          <EmptyState text="No materials match the filters." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Safety stock</TableHead>
                <TableHead className="text-right">Reorder point</TableHead>
                <TableHead className="text-right" title="Average daily issues, last 90 days">Daily use</TableHead>
                <TableHead className="text-right" title="Days the stock lasts at the current daily use">Days of cover</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Last movement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const cover = daysOfCover(r.stock_qty, r.avg_daily_consumption);
                return (
                  <TableRow key={r.material_id}>
                    <TableCell><StatusBadge status={r.stock_status} /></TableCell>
                    <TableCell className="max-w-80 truncate" title={r.description}>
                      <Link href={`/stock/${r.material_id}`} className="font-mono text-xs font-medium text-primary hover:underline">
                        {r.code}
                      </Link>{" "}
                      <span className="text-muted-foreground">{r.description}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.location_code}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatQty(r.stock_qty)} <span className="text-xs font-normal text-muted-foreground">{r.uom_code}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{formatQty(r.safety_stock)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{formatQty(r.reorder_point)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{formatQty(Number(r.avg_daily_consumption).toFixed(2))}</TableCell>
                    <TableCell className={cn("text-right tabular-nums", cover !== null && cover < r.lead_time_days && "font-medium text-destructive")}>
                      {cover === null ? <span className="text-muted-foreground">No use</span> : `${cover} d`}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatEur(r.stock_value)}</TableCell>
                    <TableCell className={cn("text-muted-foreground", r.is_slow_moving && "font-medium text-[oklch(0.45_0.1_70)]")}>
                      {formatDaysAgo(r.days_since_last_movement)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </ListCard>

      <p className="text-xs text-muted-foreground">
        Reorder point = average daily use (last 90 days) × lead time + safety stock. Days of cover in red: the stock
        runs out before a new order could arrive.
      </p>
    </>
  );
}

function Pill({ href, active, title, children }: { href: string; active: boolean; title?: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      title={title}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors",
        active ? "border-primary bg-primary/5 font-medium" : "bg-card hover:border-primary/40"
      )}
    >
      {children}
    </Link>
  );
}
