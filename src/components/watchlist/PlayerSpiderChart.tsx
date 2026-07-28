"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export interface SpiderPlayer {
  name: string;
  height_cm: number | null;
  weight_kg: number | null;
  forty_yard_dash: number | null;
  shuttle_seconds: number | null;
  vertical_jump_cm: number | null;
  broad_jump_cm: number | null;
  bench_reps: number | null;
}

// Normalise each metric to 0–100. Lower-is-better metrics are inverted.
function norm(value: number | null, min: number, max: number, lowerIsBetter = false): number {
  if (value == null) return 0;
  const clamped = Math.max(min, Math.min(max, value));
  const pct = (clamped - min) / (max - min);
  return Math.round((lowerIsBetter ? 1 - pct : pct) * 100);
}

function buildChartData(players: SpiderPlayer[]) {
  const axes = [
    { key: "speed",    label: "Speed",     getValue: (p: SpiderPlayer) => norm(p.forty_yard_dash,   4.2,  5.8, true)  },
    { key: "agility",  label: "Agility",   getValue: (p: SpiderPlayer) => norm(p.shuttle_seconds,   3.7,  5.2, true)  },
    { key: "vertical", label: "Vertical",  getValue: (p: SpiderPlayer) => norm(p.vertical_jump_cm,  50,   120, false) },
    { key: "broad",    label: "Broad Jump",getValue: (p: SpiderPlayer) => norm(p.broad_jump_cm,     180,  300, false) },
    { key: "strength", label: "Strength",  getValue: (p: SpiderPlayer) => norm(p.bench_reps,        0,    40,  false) },
    { key: "height",   label: "Height",    getValue: (p: SpiderPlayer) => norm(p.height_cm,         160,  215, false) },
    { key: "weight",   label: "Weight",    getValue: (p: SpiderPlayer) => norm(p.weight_kg,         70,   145, false) },
  ];

  return axes.map(({ key, label, getValue }) => {
    const entry: Record<string, string | number> = { subject: label };
    players.forEach((p, i) => {
      entry[`p${i}`] = getValue(p);
    });
    return entry;
  });
}

const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#f97316"];

interface PlayerSpiderChartProps {
  players: SpiderPlayer[];
}

export default function PlayerSpiderChart({ players }: PlayerSpiderChartProps) {
  if (players.length < 2) {
    return (
      <p className="py-6 text-center text-sm font-bold text-slate-400 dark:text-white/35">
        Add at least 2 players to the comparison to see the radar chart.
      </p>
    );
  }

  const data = buildChartData(players);

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="rgba(100,116,139,0.25)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: 12, fontWeight: 700, fill: "currentColor" }}
          />
          {players.map((player, i) => (
            <Radar
              key={i}
              name={player.name}
              dataKey={`p${i}`}
              stroke={COLORS[i % COLORS.length]}
              fill={COLORS[i % COLORS.length]}
              fillOpacity={0.12}
              strokeWidth={2}
              dot={{ r: 4, fill: COLORS[i % COLORS.length], strokeWidth: 0 }}
            />
          ))}
          <Legend
            iconType="circle"
            iconSize={10}
            wrapperStyle={{ fontSize: 13, fontWeight: 700, paddingTop: 12 }}
          />
          <Tooltip
            formatter={(value: number, name: string) => [`${value}/100`, name]}
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
        </RadarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
        All axes normalised to 0–100. Speed &amp; Agility: lower raw = higher score.
      </p>
    </div>
  );
}
