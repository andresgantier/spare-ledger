import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { BackLink, FormSkeleton } from "@/components/list-parts";
import { Card, CardContent } from "@/components/ui/card";
import { MaterialForm } from "../material-form";
import { loadMaterialOptions } from "../options";

export const metadata: Metadata = { title: "New material" };

export default function NewMaterialPage() {
  return (
    <>
      <BackLink href="/materials" label="Materials" />
      <PageHeader title="New material" description="Stock starts at zero. Record the first receipt or an opening balance under Movements." />
      <Suspense fallback={<FormSkeleton />}>
        <NewMaterial />
      </Suspense>
    </>
  );
}

async function NewMaterial() {
  await connection();
  const options = await loadMaterialOptions();
  return (
    <Card className="max-w-3xl">
      <CardContent>
        <MaterialForm options={options} />
      </CardContent>
    </Card>
  );
}
