import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { BackLink } from "@/components/list-parts";
import { Card, CardContent } from "@/components/ui/card";
import { LocationForm } from "../location-form";

export const metadata: Metadata = { title: "New location" };

export default function NewLocationPage() {
  return (
    <>
      <BackLink href="/locations" label="Locations" />
      <PageHeader title="New location" />
      <Card className="max-w-3xl">
        <CardContent>
          <LocationForm />
        </CardContent>
      </Card>
    </>
  );
}
