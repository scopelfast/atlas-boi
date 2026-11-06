"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_COLORS, CHART_MUTED } from "./chart-theme";

export type ChartPieItem = { label: string; valor: number };

export function ReportPieChart({
  data,
  valueFormatter,
  height = 240,
}: {
  data: ChartPieItem[];
  valueFormatter?: (v: number) => string;
  height?: number;
}) {
  const fmt = valueFormatter ?? ((v: number) => String(v));
  const chartData = data.filter((d) => d.valor > 0).map((d) => ({ name: d.label, valor: d.valor }));

  if (chartData.length === 0) return null;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="valor"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={88}
            paddingAngle={2}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v) => [fmt(Number(v ?? 0)), ""]}
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {chartData.map((d, i) => (
          <span key={d.name} className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            {d.name}
          </span>
        ))}
      </div>
    </div>
  );
}
