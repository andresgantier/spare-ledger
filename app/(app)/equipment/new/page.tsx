import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { BackLink, FormSkeleton, LoadError } from "@/components/list-parts";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { Area } from "@/lib/types";
import { EquipmentForm } from "../equipment-form";

export const metadata: Metadata = { title: "New equipment" };

export default function NewEquipmentPage() {
  return (
    <>
      <BackLink href="/equipment" label="Equipment" />
      <PageHeader title="New equipment" />
      <Suspense fallback={<FormSkeleton />}>
        <NewEquipment />
      </Suspense>
    </>
  );
}

async function NewEquipment() {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.from("areas").select("id, code, name").order("name");
  if (error) return <LoadError message={error.message} />;
  const areas = ((data ?? []) as Area[]).map((a) => ({ value: String(a.id), label: a.name }));

  return (
    <Card className="max-w-3xl">
      <CardContent>
        <EquipmentForm areas={areas} />
      </CardContent>
    </Card>
  );
}
