import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { BackLink, FormSkeleton, LoadError } from "@/components/list-parts";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { Location } from "@/lib/types";
import { LocationForm } from "../location-form";

export const metadata: Metadata = { title: "Edit location" };

export default function EditLocationPage({ params }: PageProps<"/locations/[id]">) {
  return (
    <>
      <BackLink href="/locations" label="Locations" />
      <Suspense fallback={<FormSkeleton />}>
        <EditLocation params={params} />
      </Suspense>
    </>
  );
}

async function EditLocation({ params }: { params: PageProps<"/locations/[id]">["params"] }) {
  await connection();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("locations")
    .select("id, code, description, is_active")
    .eq("id", id)
    .maybeSingle();
  if (error) return <LoadError message={error.message} />;
  if (!data) notFound();
  const location = data as Location;

  return (
    <>
      <PageHeader title={`Location ${location.code}`} description={location.description ?? undefined} />
      <Card className="max-w-3xl">
        <CardContent>
          <LocationForm location={location} />
        </CardContent>
      </Card>
    </>
  );
}
