"use client";

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatEur, formatQty } from "@/lib/format";
import { ChartTooltipBox } from "./chart-tooltip";

export type TopItem = { code: string; description: string; value: number; quantity: number; uom: string };

const compactEur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", notation: "compact", maximumFractionDigits: 1 });

// Top 10 materials by value issued in the last 90 days (horizontal bars, value at the tip)
export function TopConsumptionChart({ data }: { data: TopItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 30 + 16)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="code"
          width={84}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.6 }}
          content={({ active, payload }) => {
            const p = active && payload?.[0] ? (payload[0].payload as TopItem) : null;
            if (!p) return null;
            return (
              <ChartTooltipBox title={`${p.code} · ${p.description}`}>
                <p><span className="font-medium text-foreground">{formatEur(p.value)}</span> issued in 90 days</p>
                <p>{formatQty(p.quantity)} {p.uom}</p>
              </ChartTooltipBox>
            );
          }}
        />
        <Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]} maxBarSize={18}>
          <LabelList
            dataKey="value"
            position="right"
            formatter={(v) => compactEur.format(Number(v))}
            style={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
