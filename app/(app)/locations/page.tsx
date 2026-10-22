import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActiveBadge, CodeLink, EmptyState, FilterBar, ListCard, ListSkeleton, LoadError, SavedNotice } from "@/components/list-parts";
import { cleanSearch, firstParam } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import type { Location } from "@/lib/types";

export const metadata: Metadata = { title: "Locations" };

export default function LocationsPage({ searchParams }: PageProps<"/locations">) {
  return (
    <>
      <PageHeader
        title="Locations"
        description="Storage bins in the warehouse (aisle-rack-shelf)."
        actions={
          <Button asChild>
            <Link href="/locations/new"><Plus />New location</Link>
          </Button>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <LocationsList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function LocationsList({ searchParams }: { searchParams: PageProps<"/locations">["searchParams"] }) {
  await connection();
  const params = await searchParams;
  const q = cleanSearch(params.q);
  const includeInactive = firstParam(params.inactive) === "on";

  const supabase = await createClient();
  let query = supabase.from("locations").select("id, code, description, is_active").order("code");
  if (q) query = query.or(`code.ilike.%${q}%,description.ilike.%${q}%`);
  if (!includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) return <LoadError message={error.message} />;
  const rows = (data ?? []) as Location[];

  // Materials stored in each location (all materials, active ones only)
  const { data: counts } = await supabase.from("materials").select("location_id").eq("is_active", true);
  const perLocation = new Map<number, number>();
  for (const m of (counts ?? []) as { location_id: number }[]) {
    perLocation.set(m.location_id, (perLocation.get(m.location_id) ?? 0) + 1);
  }

  return (
    <>
      <SavedNotice code={firstParam(params.saved)} />
      <FilterBar action="/locations" q={q} placeholder="Search code or description" includeInactive={includeInactive} />
      <ListCard count={rows.length} noun="location">
        {rows.length === 0 ? (
          <EmptyState text="No locations match the filters." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Materials</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((l) => (
                <TableRow key={l.id}>
                  <TableCell><CodeLink href={`/locations/${l.id}`} code={l.code} /></TableCell>
                  <TableCell>{l.description}</TableCell>
                  <TableCell className="text-right tabular-nums">{perLocation.get(l.id) ?? 0}</TableCell>
                  <TableCell><ActiveBadge active={l.is_active} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ListCard>
    </>
  );
}
