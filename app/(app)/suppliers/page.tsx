import type { Metadata } from "next";
import { Truck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Suppliers" };

export default function Page() {
  return (
    <>
      <PageHeader title="Suppliers" description="Suppliers and their contact details." />
      <ComingSoon icon={Truck} text="The suppliers list and form will be added in Phase 5." />
    </>
  );
}
