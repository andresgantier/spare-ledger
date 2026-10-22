import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { BackLink } from "@/components/list-parts";
import { Card, CardContent } from "@/components/ui/card";
import { SupplierForm } from "../supplier-form";

export const metadata: Metadata = { title: "New supplier" };

export default function NewSupplierPage() {
  return (
    <>
      <BackLink href="/suppliers" label="Suppliers" />
      <PageHeader title="New supplier" />
      <Card className="max-w-3xl">
        <CardContent>
          <SupplierForm />
        </CardContent>
      </Card>
    </>
  );
}
