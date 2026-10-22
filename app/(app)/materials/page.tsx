import type { Metadata } from "next";
import { Package } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Materials" };

export default function Page() {
  return (
    <>
      <PageHeader title="Materials" description="Spare parts master data." />
      <ComingSoon icon={Package} text="The materials list and form will be added in Phase 5." />
    </>
  );
}
