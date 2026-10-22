import type { Metadata } from "next";
import { Factory } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Equipment" };

export default function Page() {
  return (
    <>
      <PageHeader title="Equipment" description="Machines and areas that receive spare parts." />
      <ComingSoon icon={Factory} text="The equipment list and form will be added in Phase 5." />
    </>
  );
}
