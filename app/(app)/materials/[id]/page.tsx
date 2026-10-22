import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { BackLink, FormSkeleton, LoadError } from "@/components/list-parts";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { Material } from "@/lib/types";
import { MaterialForm } from "../material-form";
import { loadMaterialOptions } from "../options";

export const metadata: Metadata = { title: "Edit material" };

export default function EditMaterialPage({ params }: PageProps<"/materials/[id]">) {
  return (
    <>
      <BackLink href="/materials" label="Materials" />
      <Suspense fallback={<FormSkeleton />}>
        <EditMaterial params={params} />
      </Suspense>
    </>
  );
}

async function EditMaterial({ params }: { params: PageProps<"/materials/[id]">["params"] }) {
  await connection();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materials")
    .select("id, code, description, category_id, uom_code, location_id, supplier_id, lead_time_days, unit_cost, safety_stock, is_active")
    .eq("id", id)
    .maybeSingle();
  if (error) return <LoadError message={error.message} />;
  if (!data) notFound();
  const material = data as Material;
  const options = await loadMaterialOptions(material);

  return (
    <>
      <PageHeader title={material.code} description={material.description} />
      <Card className="max-w-3xl">
        <CardContent>
          <MaterialForm material={material} options={options} />
        </CardContent>
      </Card>
    </>
  );
}
