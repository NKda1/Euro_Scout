"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { SpiderPlayer } from "@/components/watchlist/PlayerSpiderChart";

// Normalise each metric to 0–100 (same logic as radar chart).
function norm(value: number | null, min: number, max: number, lowerIsBetter = false): number {
  if (value == null) return 0;
  const clamped = Math.max(min, Math.min(max, value));
  const pct = (clamped - min) / (max - min);
  return Math.round((lowerIsBetter ? 1 - pct : pct) * 100);
}

function buildBarData(players: SpiderPlayer[]) {
  const metrics = [
    { label: "Speed",      getValue: (p: SpiderPlayer) => norm(p.forty_yard_dash,  4.2, 5.8, true) },
    { label: "Agility",    getValue: (p: SpiderPlayer) => norm(p.shuttle_seconds,  3.7, 5.2, true) },
    { label: "Vertical",   getValue: (p: SpiderPlayer) => norm(p.vertical_jump_cm, 50, 120) },
    { label: "Broad Jump", getValue: (p: SpiderPlayer) => norm(p.broad_jump_cm,    180, 300) },
    { label: "Strength",   getValue: (p: SpiderPlayer) => norm(p.bench_reps,       0, 40) },
    { label: "Height",     getValue: (p: SpiderPlayer) => norm(p.height_cm,        160, 215) },
    { label: "Weight",     getValue: (p: SpiderPlayer) => norm(p.weight_kg,        70, 145) },
  ];

  return metrics.map(({ label, getValue }) => {
    const entry: Record<string, string | number> = { metric: label };
    players.forEach((p, i) => {
      entry[`p${i}`] = getValue(p);
    });
    return entry;
  });
}

const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#f97316"];

interface PlayerBarChartProps {
  players: SpiderPlayer[];
}

export default function PlayerBarChart({ players }: PlayerBarChartProps) {
  if (players.length < 2) {
    return (
      <p className="py-6 text-center text-sm font-bold text-slate-400 dark:text-white/35">
        Add at least 2 players to the comparison to see the bar chart.
      </p>
    );
  }

  const data = buildBarData(players);

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.2)" />
          <XAxis
            dataKey="metric"
            tick={{ fontSize: 11, fontWeight: 700, fill: "currentColor" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fontWeight: 700, fill: "currentColor" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value, name) => [`${value}/100`, name]}
            contentStyle={{
              background: "var(--tooltip-bg, #1e293b)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
            }}
            labelStyle={{ color: "#94a3b8", fontWeight: 800, marginBottom: 4 }}
            itemStyle={{ color: "#e2e8f0" }}
          />
          <Legend
            iconType="circle"
            iconSize={10}
            wrapperStyle={{ fontSize: 13, fontWeight: 700, paddingTop: 12 }}
          />
          {players.map((player, i) => (
            <Bar
              key={i}
              dataKey={`p${i}`}
              name={player.name}
              fill={COLORS[i % COLORS.length]}
              fillOpacity={0.85}
              radius={[3, 3, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
        All axes normalised to 0–100. Speed &amp; Agility: lower raw = higher score.
      </p>
    </div>
  );
}
