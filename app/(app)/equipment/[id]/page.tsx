import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { BackLink, FormSkeleton, LoadError } from "@/components/list-parts";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { Area, Equipment } from "@/lib/types";
import { EquipmentForm } from "../equipment-form";

export const metadata: Metadata = { title: "Edit equipment" };

export default function EditEquipmentPage({ params }: PageProps<"/equipment/[id]">) {
  return (
    <>
      <BackLink href="/equipment" label="Equipment" />
      <Suspense fallback={<FormSkeleton />}>
        <EditEquipment params={params} />
      </Suspense>
    </>
  );
}

async function EditEquipment({ params }: { params: PageProps<"/equipment/[id]">["params"] }) {
  await connection();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const supabase = await createClient();
  const [{ data, error }, { data: areaData }] = await Promise.all([
    supabase.from("equipment").select("id, code, name, area_id, is_active").eq("id", id).maybeSingle(),
    supabase.from("areas").select("id, code, name").order("name"),
  ]);
  if (error) return <LoadError message={error.message} />;
  if (!data) notFound();
  const equipment = data as Equipment;
  const areas = ((areaData ?? []) as Area[]).map((a) => ({ value: String(a.id), label: a.name }));

  return (
    <>
      <PageHeader title={equipment.name} description={`Equipment ${equipment.code}`} />
      <Card className="max-w-3xl">
        <CardContent>
          <EquipmentForm equipment={equipment} areas={areas} />
        </CardContent>
      </Card>
    </>
  );
}
