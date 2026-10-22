import type { Metadata } from "next";
import { Warehouse } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Locations" };

export default function Page() {
  return (
    <>
      <PageHeader title="Locations" description="Storage bins in the warehouse." />
      <ComingSoon icon={Warehouse} text="The locations list and form will be added in Phase 5." />
    </>
  );
}
