import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActiveBadge, CodeLink, EmptyState, FilterBar, ListCard, ListSkeleton, LoadError, SavedNotice } from "@/components/list-parts";
import { cleanSearch, firstParam } from "@/lib/forms";
import { formatEur } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Materials" };

type MaterialRow = {
  id: number;
  code: string;
  description: string;
  uom_code: string;
  lead_time_days: number;
  unit_cost: number;
  safety_stock: number;
  is_active: boolean;
  category: { name: string } | null;
  location: { code: string } | null;
  supplier: { name: string } | null;
};

export default function MaterialsPage({ searchParams }: PageProps<"/materials">) {
  return (
    <>
      <PageHeader
        title="Materials"
        description="Spare parts master data: where each part is stored, who supplies it and how long delivery takes."
        actions={
          <Button asChild>
            <Link href="/materials/new"><Plus />New material</Link>
          </Button>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <MaterialsList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function MaterialsList({ searchParams }: { searchParams: PageProps<"/materials">["searchParams"] }) {
  await connection();
  const params = await searchParams;
  const q = cleanSearch(params.q);
  const categoryId = firstParam(params.category) ?? "";
  const supplierId = firstParam(params.supplier) ?? "";
  const includeInactive = firstParam(params.inactive) === "on";

  const supabase = await createClient();
  let query = supabase
    .from("materials")
    .select(
      "id, code, description, uom_code, lead_time_days, unit_cost, safety_stock, is_active, category:categories(name), location:locations(code), supplier:suppliers(name)"
    )
    .order("code");
  if (q) query = query.or(`code.ilike.%${q}%,description.ilike.%${q}%`);
  if (categoryId) query = query.eq("category_id", Number(categoryId));
  if (supplierId) query = query.eq("supplier_id", Number(supplierId));
  if (!includeInactive) query = query.eq("is_active", true);

  const [{ data, error }, { data: categories }, { data: suppliers }] = await Promise.all([
    query,
    supabase.from("categories").select("id, name").order("name"),
    supabase.from("suppliers").select("id, name").order("name"),
  ]);
  if (error) return <LoadError message={error.message} />;
  const rows = (data ?? []) as unknown as MaterialRow[];

  return (
    <>
      <SavedNotice code={firstParam(params.saved)} />
      <FilterBar action="/materials" q={q} placeholder="Search code or description" includeInactive={includeInactive}>
        <NativeSelect name="category" defaultValue={categoryId} aria-label="Category" className="sm:w-48">
          <option value="">All categories</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </NativeSelect>
        <NativeSelect name="supplier" defaultValue={supplierId} aria-label="Supplier" className="sm:w-56">
          <option value="">All suppliers</option>
          {(suppliers ?? []).map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </NativeSelect>
      </FilterBar>

      <ListCard count={rows.length} noun="material">
        {rows.length === 0 ? (
          <EmptyState text="No materials match the filters." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Lead time</TableHead>
                <TableHead className="text-right">Unit cost</TableHead>
                <TableHead className="text-right">Safety stock</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((m) => (
                <TableRow key={m.id}>
                  <TableCell><CodeLink href={`/materials/${m.id}`} code={m.code} /></TableCell>
                  <TableCell className="max-w-72 truncate" title={m.description}>{m.description}</TableCell>
                  <TableCell>{m.category?.name}</TableCell>
                  <TableCell className="text-muted-foreground">{m.uom_code}</TableCell>
                  <TableCell className="font-mono text-xs">{m.location?.code}</TableCell>
                  <TableCell className="max-w-48 truncate" title={m.supplier?.name}>{m.supplier?.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.lead_time_days} d</TableCell>
                  <TableCell className="text-right tabular-nums">{formatEur(m.unit_cost)}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(m.safety_stock)}</TableCell>
                  <TableCell><ActiveBadge active={m.is_active} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ListCard>
    </>
  );
}
