"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS, CHART_GRID, CHART_MUTED } from "./chart-theme";

export type ChartBarItem = { label: string; valor: number };

export function ReportBarChart({
  data,
  valueFormatter,
  height = 260,
}: {
  data: ChartBarItem[];
  valueFormatter?: (v: number) => string;
  height?: number;
}) {
  const fmt = valueFormatter ?? ((v: number) => String(v));
  const chartData = data.map((d) => ({ name: d.label, valor: d.valor }));

  if (chartData.length === 0) return null;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: CHART_MUTED, fontSize: 11 }}
            interval={0}
            angle={chartData.length > 4 ? -25 : 0}
            textAnchor={chartData.length > 4 ? "end" : "middle"}
            height={chartData.length > 4 ? 56 : 32}
          />
          <YAxis tick={{ fill: CHART_MUTED, fontSize: 11 }} width={72} />
          <Tooltip
            formatter={(v) => [fmt(Number(v ?? 0)), "Valor"]}
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar dataKey="valor" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
