import type { Metadata } from "next";
import { Boxes } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Stock" };

export default function Page() {
  return (
    <>
      <PageHeader title="Stock" description="Current stock, reorder points and traffic-light status per material." />
      <ComingSoon icon={Boxes} text="The filterable stock list and the history per material will be added in Phase 7." />
    </>
  );
}
