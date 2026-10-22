import type { Metadata } from "next";
import { ArrowLeftRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Movements" };

export default function Page() {
  return (
    <>
      <PageHeader title="Movements" description="Record receipts, issues and adjustments." />
      <ComingSoon icon={ArrowLeftRight} text="Receipt, issue and adjustment forms will be added in Phase 6." />
    </>
  );
}
