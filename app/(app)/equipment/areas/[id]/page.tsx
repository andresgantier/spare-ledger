import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { BackLink, FormSkeleton, LoadError } from "@/components/list-parts";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { Area } from "@/lib/types";
import { AreaForm } from "../../area-form";

export const metadata: Metadata = { title: "Edit area" };

export default function EditAreaPage({ params }: PageProps<"/equipment/areas/[id]">) {
  return (
    <>
      <BackLink href="/equipment" label="Equipment" />
      <Suspense fallback={<FormSkeleton />}>
        <EditArea params={params} />
      </Suspense>
    </>
  );
}

async function EditArea({ params }: { params: PageProps<"/equipment/areas/[id]">["params"] }) {
  await connection();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase.from("areas").select("id, code, name").eq("id", id).maybeSingle();
  if (error) return <LoadError message={error.message} />;
  if (!data) notFound();
  const area = data as Area;

  return (
    <>
      <PageHeader title={area.name} description={`Area ${area.code}`} />
      <Card className="max-w-3xl">
        <CardContent>
          <AreaForm area={area} />
        </CardContent>
      </Card>
    </>
  );
}
