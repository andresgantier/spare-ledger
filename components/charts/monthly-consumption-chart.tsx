"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatEur, formatInt } from "@/lib/format";
import { ChartTooltipBox } from "./chart-tooltip";

export type MonthlyPoint = { month: string; label: string; value: number; issues: number; partial: boolean };

const compactEur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", notation: "compact", maximumFractionDigits: 1 });

// Value of parts issued to machines per month (single series: one hue, no legend)
export function MonthlyConsumptionChart({ data }: { data: MonthlyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 24, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--border)" }} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
        <YAxis
          width={56}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          tickFormatter={(v: number) => compactEur.format(v)}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.6 }}
          content={({ active, payload }) => {
            const p = active && payload?.[0] ? (payload[0].payload as MonthlyPoint) : null;
            if (!p) return null;
            return (
              <ChartTooltipBox title={`${p.label}${p.partial ? " (month to date)" : ""}`}>
                <p><span className="font-medium text-foreground">{formatEur(p.value)}</span> issued</p>
                <p>{formatInt(p.issues)} issue movements</p>
              </ChartTooltipBox>
            );
          }}
        />
        <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={24}>
          {/* The running month is lighter: it is not complete yet */}
          {data.map((d) => (
            <Cell key={d.month} fillOpacity={d.partial ? 0.4 : 1} />
          ))}
          <LabelList
            dataKey="value"
            position="top"
            formatter={(v) => compactEur.format(Number(v))}
            style={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
