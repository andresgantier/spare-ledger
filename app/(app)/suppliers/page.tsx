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
import type { Supplier } from "@/lib/types";

export const metadata: Metadata = { title: "Suppliers" };

export default function SuppliersPage({ searchParams }: PageProps<"/suppliers">) {
  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Who supplies each spare part, and how to reach them."
        actions={
          <Button asChild>
            <Link href="/suppliers/new"><Plus />New supplier</Link>
          </Button>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <SuppliersList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function SuppliersList({ searchParams }: { searchParams: PageProps<"/suppliers">["searchParams"] }) {
  await connection();
  const params = await searchParams;
  const q = cleanSearch(params.q);
  const includeInactive = firstParam(params.inactive) === "on";

  const supabase = await createClient();
  let query = supabase
    .from("suppliers")
    .select("id, code, name, contact_name, email, phone, is_active")
    .order("name");
  if (q) query = query.or(`code.ilike.%${q}%,name.ilike.%${q}%,contact_name.ilike.%${q}%`);
  if (!includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) return <LoadError message={error.message} />;
  const rows = (data ?? []) as Supplier[];

  // Number of active materials bought from each supplier
  const { data: mats } = await supabase.from("materials").select("supplier_id").eq("is_active", true);
  const perSupplier = new Map<number, number>();
  for (const m of (mats ?? []) as { supplier_id: number }[]) {
    perSupplier.set(m.supplier_id, (perSupplier.get(m.supplier_id) ?? 0) + 1);
  }

  return (
    <>
      <SavedNotice code={firstParam(params.saved)} />
      <FilterBar action="/suppliers" q={q} placeholder="Search code, name or contact" includeInactive={includeInactive} />
      <ListCard count={rows.length} noun="supplier">
        {rows.length === 0 ? (
          <EmptyState text="No suppliers match the filters." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Materials</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell><CodeLink href={`/suppliers/${s.id}`} code={s.code} /></TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.contact_name}</TableCell>
                  <TableCell>
                    {s.email && (
                      <a href={`mailto:${s.email}`} className="text-muted-foreground hover:text-foreground hover:underline">
                        {s.email}
                      </a>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.phone}</TableCell>
                  <TableCell className="text-right tabular-nums">{perSupplier.get(s.id) ?? 0}</TableCell>
                  <TableCell><ActiveBadge active={s.is_active} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ListCard>
    </>
  );
}
