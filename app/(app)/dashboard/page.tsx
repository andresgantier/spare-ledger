import type { Metadata } from "next";
import { Suspense } from "react";
import { LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ComingSoon } from "@/components/coming-soon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { formatEur, formatInt } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" description="Inventory health at a glance." />
      <Suspense fallback={<KpiSkeleton />}>
        <KpiCards />
      </Suspense>
      <ComingSoon
        icon={LayoutDashboard}
        text="Charts, top consumption and latest movements will be added in Phase 8."
      />
    </>
  );
}

// Reads v_dashboard_kpis. Data only appears for signed-in users (RLS).
async function KpiCards() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("v_dashboard_kpis").select("*").single();

  if (error || !data) {
    return (
      <p className="text-sm text-destructive">Could not load the KPIs: {error?.message}</p>
    );
  }

  const kpis = [
    { label: "Inventory value", value: formatEur(data.total_inventory_value), tone: "" },
    { label: "Below safety stock", value: formatInt(data.red_count), tone: "bg-status-red" },
    { label: "At reorder point", value: formatInt(data.yellow_count), tone: "bg-status-yellow" },
    { label: "Active materials", value: formatInt(data.active_materials), tone: "" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="gap-2">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              {kpi.tone && <span className={`size-2 rounded-full ${kpi.tone}`} />}
              {kpi.label}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl tabular-nums">{kpi.value}</CardTitle>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  );
}
