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
import { createClient } from "@/lib/supabase/server";
import type { Area } from "@/lib/types";

export const metadata: Metadata = { title: "Equipment" };

type EquipmentRow = {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  area: { name: string } | null;
};

export default function EquipmentPage({ searchParams }: PageProps<"/equipment">) {
  return (
    <>
      <PageHeader
        title="Equipment"
        description="Machines that receive spare parts, grouped by plant area."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/equipment/areas/new"><Plus />New area</Link>
            </Button>
            <Button asChild>
              <Link href="/equipment/new"><Plus />New equipment</Link>
            </Button>
          </>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <EquipmentList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function EquipmentList({ searchParams }: { searchParams: PageProps<"/equipment">["searchParams"] }) {
  await connection();
  const params = await searchParams;
  const q = cleanSearch(params.q);
  const areaId = firstParam(params.area) ?? "";
  const includeInactive = firstParam(params.inactive) === "on";

  const supabase = await createClient();
  let query = supabase
    .from("equipment")
    .select("id, code, name, is_active, area:areas(name)")
    .order("code");
  if (q) query = query.or(`code.ilike.%${q}%,name.ilike.%${q}%`);
  if (areaId) query = query.eq("area_id", Number(areaId));
  if (!includeInactive) query = query.eq("is_active", true);

  const [{ data, error }, { data: areaData }, { data: allEquipment }] = await Promise.all([
    query,
    supabase.from("areas").select("id, code, name").order("name"),
    supabase.from("equipment").select("area_id").eq("is_active", true),
  ]);
  if (error) return <LoadError message={error.message} />;
  const rows = (data ?? []) as unknown as EquipmentRow[];
  const areas = (areaData ?? []) as Area[];

  const perArea = new Map<number, number>();
  for (const e of (allEquipment ?? []) as { area_id: number }[]) {
    perArea.set(e.area_id, (perArea.get(e.area_id) ?? 0) + 1);
  }

  return (
    <>
      <SavedNotice code={firstParam(params.saved)} />
      <FilterBar action="/equipment" q={q} placeholder="Search code or name" includeInactive={includeInactive}>
        <NativeSelect name="area" defaultValue={areaId} aria-label="Area" className="sm:w-52">
          <option value="">All areas</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </NativeSelect>
      </FilterBar>

      <ListCard count={rows.length} noun="machine">
        {rows.length === 0 ? (
          <EmptyState text="No equipment matches the filters." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e) => (
                <TableRow key={e.id}>
                  <TableCell><CodeLink href={`/equipment/${e.id}`} code={e.code} /></TableCell>
                  <TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell>{e.area?.name}</TableCell>
                  <TableCell><ActiveBadge active={e.is_active} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ListCard>

      <h2 className="pt-4 text-lg font-semibold tracking-tight">Areas</h2>
      <ListCard count={areas.length} noun="area">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Active equipment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {areas.map((a) => (
              <TableRow key={a.id}>
                <TableCell><CodeLink href={`/equipment/areas/${a.id}`} code={a.code} /></TableCell>
                <TableCell className="font-medium">{a.name}</TableCell>
                <TableCell className="text-right tabular-nums">{perArea.get(a.id) ?? 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListCard>
    </>
  );
}
