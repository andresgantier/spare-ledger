import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { FormSkeleton, ListCard, LoadError } from "@/components/list-parts";
import { MovementsTable } from "@/components/movements-table";
import { Card, CardContent } from "@/components/ui/card";
import { firstParam } from "@/lib/forms";
import { formatQty } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { MovementHistoryRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { MovementKind } from "./actions";
import { MovementForm, type EquipmentGroup, type MaterialChoice } from "./movement-form";

export const metadata: Metadata = { title: "Movements" };

const KINDS: { kind: MovementKind; label: string; description: string; icon: typeof ArrowDownLeft }[] = [
  { kind: "receipt", label: "Receipt", description: "Goods arrive from a supplier", icon: ArrowDownLeft },
  { kind: "issue", label: "Issue", description: "Parts go to a machine", icon: ArrowUpRight },
  { kind: "adjustment", label: "Adjustment", description: "Count difference, damage, return", icon: SlidersHorizontal },
];

const isKind = (v: string | undefined): v is MovementKind => v === "receipt" || v === "issue" || v === "adjustment";

export default function MovementsPage({ searchParams }: PageProps<"/movements">) {
  return (
    <>
      <PageHeader
        title="Movements"
        description="Every change in stock is a movement. Recorded movements cannot be edited or deleted; corrections are adjustments."
      />
      <Suspense fallback={<FormSkeleton />}>
        <MovementsContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function MovementsContent({ searchParams }: { searchParams: PageProps<"/movements">["searchParams"] }) {
  await connection();
  const params = await searchParams;
  const typeParam = firstParam(params.type);
  const kind: MovementKind = isKind(typeParam) ? typeParam : "issue";
  const materialParam = firstParam(params.material);
  const doneId = Number(firstParam(params.done)) || undefined;

  const supabase = await createClient();
  const [materials, suppliers, equipment, reasons, latest] = await Promise.all([
    supabase
      .from("v_material_status")
      .select("material_id, code, description, uom_code, stock_qty, location_code, supplier_id, supplier_name, stock_status")
      .eq("is_active", true)
      .order("code"),
    supabase.from("suppliers").select("id, name").eq("is_active", true).order("name"),
    supabase.from("equipment").select("id, code, name, area:areas(name)").eq("is_active", true).order("code"),
    supabase.from("adjustment_reasons").select("code, description").order("description"),
    supabase.from("v_movement_history").select("*").order("movement_date", { ascending: false }).order("id", { ascending: false }).limit(15),
  ]);

  const failed = [materials, suppliers, equipment, reasons, latest].find((r) => r.error);
  if (failed?.error) return <LoadError message={failed.error.message} />;

  const materialChoices: MaterialChoice[] = (materials.data ?? []).map((m) => ({
    id: m.material_id,
    code: m.code,
    description: m.description,
    uom: m.uom_code,
    stock: Number(m.stock_qty),
    location: m.location_code,
    supplierId: m.supplier_id,
    supplierName: m.supplier_name,
    status: m.stock_status,
  }));

  const groups = new Map<string, EquipmentGroup>();
  for (const e of (equipment.data ?? []) as unknown as { id: number; code: string; name: string; area: { name: string } | null }[]) {
    const area = e.area?.name ?? "Other";
    if (!groups.has(area)) groups.set(area, { area, items: [] });
    groups.get(area)!.items.push({ value: String(e.id), label: `${e.code} · ${e.name}` });
  }
  const equipmentGroups = [...groups.values()].sort((a, b) => a.area.localeCompare(b.area));

  const latestRows = (latest.data ?? []) as MovementHistoryRow[];
  const done = doneId ? latestRows.find((r) => r.id === doneId) : undefined;
  const initialMaterialId = materialChoices.some((m) => String(m.id) === materialParam) ? materialParam : undefined;

  return (
    <>
      {/* Movement type selector */}
      <div className="grid gap-3 sm:grid-cols-3">
        {KINDS.map(({ kind: k, label, description, icon: Icon }) => {
          const active = k === kind;
          return (
            <Link
              key={k}
              href={`/movements?type=${k}${initialMaterialId ? `&material=${initialMaterialId}` : ""}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors",
                active ? "border-primary ring-1 ring-primary" : "hover:border-primary/40"
              )}
            >
              <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
                <Icon className="size-4" />
              </div>
              <div>
                <p className="font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {done && (
        <p className="flex items-center gap-2 rounded-md border border-status-green/30 bg-status-green/10 px-3 py-2 text-sm">
          <CheckCircle2 className="size-4 shrink-0 text-status-green" />
          <span>
            Recorded: {done.movement_type.toLowerCase()} of{" "}
            <span className="font-medium">{formatQty(Math.abs(done.quantity))} {done.uom_code}</span>{" "}
            <span className="font-mono text-xs">{done.material_code}</span>.{" "}
            New stock:{" "}
            <span className="font-medium">
              {formatQty(materialChoices.find((m) => m.id === done.material_id)?.stock ?? 0)} {done.uom_code}
            </span>
          </span>
        </p>
      )}

      <Card className="max-w-4xl">
        <CardContent>
          <MovementForm
            key={`${kind}-${doneId ?? ""}`}
            kind={kind}
            materials={materialChoices}
            suppliers={(suppliers.data ?? []).map((s) => ({ value: String(s.id), label: s.name }))}
            equipment={equipmentGroups}
            reasons={(reasons.data ?? []).map((r) => ({ value: r.code, label: r.description }))}
            initialMaterialId={initialMaterialId}
          />
        </CardContent>
      </Card>

      <h2 className="pt-4 text-lg font-semibold tracking-tight">Latest movements</h2>
      <ListCard count={latestRows.length} noun="movement">
        <MovementsTable rows={latestRows} highlightId={doneId} />
      </ListCard>
    </>
  );
}
