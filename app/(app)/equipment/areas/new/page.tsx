import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { BackLink } from "@/components/list-parts";
import { Card, CardContent } from "@/components/ui/card";
import { AreaForm } from "../../area-form";

export const metadata: Metadata = { title: "New area" };

export default function NewAreaPage() {
  return (
    <>
      <BackLink href="/equipment" label="Equipment" />
      <PageHeader title="New area" description="A plant area groups machines, e.g. Assembly or Paint shop." />
      <Card className="max-w-3xl">
        <CardContent>
          <AreaForm />
        </CardContent>
      </Card>
    </>
  );
}
