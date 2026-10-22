import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { BackLink, FormSkeleton, LoadError } from "@/components/list-parts";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { Supplier } from "@/lib/types";
import { SupplierForm } from "../supplier-form";

export const metadata: Metadata = { title: "Edit supplier" };

export default function EditSupplierPage({ params }: PageProps<"/suppliers/[id]">) {
  return (
    <>
      <BackLink href="/suppliers" label="Suppliers" />
      <Suspense fallback={<FormSkeleton />}>
        <EditSupplier params={params} />
      </Suspense>
    </>
  );
}

async function EditSupplier({ params }: { params: PageProps<"/suppliers/[id]">["params"] }) {
  await connection();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, code, name, contact_name, email, phone, is_active")
    .eq("id", id)
    .maybeSingle();
  if (error) return <LoadError message={error.message} />;
  if (!data) notFound();
  const supplier = data as Supplier;

  return (
    <>
      <PageHeader title={supplier.name} description={`Supplier ${supplier.code}`} />
      <Card className="max-w-3xl">
        <CardContent>
          <SupplierForm supplier={supplier} />
        </CardContent>
      </Card>
    </>
  );
}
