"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

interface ChartPoint {
  label: string;
  value: number;
}

interface ChartSeries {
  name: string;
  tone: "red" | "slate" | "green";
  points: ChartPoint[];
}

interface AdminAnalyticsChartsProps {
  pulseSeries: ChartSeries[];
  engagementBars: ChartPoint[];
  conversionBars: ChartPoint[];
  pulseTitle?: string;
  pulseHelper?: string;
  engagementTitle?: string;
  engagementHelper?: string;
  funnelTitle?: string;
  funnelHelper?: string;
}

interface TooltipPayload {
  name?: string;
  value?: number | string;
  color?: string;
}

interface TooltipContentProps {
  active?: boolean;
  label?: string;
  payload?: TooltipPayload[];
}

const tones: Record<ChartSeries["tone"], { stroke: string; fill: string; text: string }> = {
  red: { stroke: "#dc2626", fill: "#fee2e2", text: "text-red-600 dark:text-red-300" },
  slate: { stroke: "#64748b", fill: "#e2e8f0", text: "text-slate-600 dark:text-slate-300" },
  green: { stroke: "#059669", fill: "#d1fae5", text: "text-emerald-600 dark:text-emerald-300" }
};

function sliceSeries(series: ChartSeries[], range: number) {
  return series.map((item) => ({
    ...item,
    points: item.points.slice(-range)
  }));
}

function rangeTotal(series: ChartSeries[]) {
  return series.reduce((total, item) => total + item.points.reduce((sum, point) => sum + point.value, 0), 0);
}

function buildSeriesData(series: ChartSeries[]) {
  const labels = series[0]?.points ?? [];

  return labels.map((point, index) => {
    const row: Record<string, string | number> = { label: point.label };
    for (const item of series) {
      row[item.name] = item.points[index]?.value ?? 0;
    }
    return row;
  });
}

function ChartTooltip({ active, label, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="border border-slate-200 bg-white p-3 shadow-lg dark:border-white/10 dark:bg-[#090909]">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-white/40">{label}</p>
      <div className="mt-2 space-y-2">
        {payload.map((item) => (
          <div key={item.name} className="flex min-w-40 items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              {item.name}
            </span>
            <span className="text-sm font-black text-slate-950 dark:text-white">{item.value ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LinePulseChart({ series, title, helper }: { series: ChartSeries[]; title: string; helper: string }) {
  const [range, setRange] = useState(30);
  const visibleSeries = useMemo(() => sliceSeries(series, range), [range, series]);
  const chartData = useMemo(() => buildSeriesData(visibleSeries), [visibleSeries]);
  const total = rangeTotal(visibleSeries);

  return (
    <section className="border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#111] sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xl font-black text-slate-950 dark:text-white">{title}</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-white/45">{helper}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[7, 14, 30].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRange(item)}
              className={`h-9 border px-3 text-xs font-black uppercase tracking-[0.12em] transition ${
                range === item
                  ? "border-red-600 bg-red-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-300"
              }`}
            >
              {item}D
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0 border border-slate-200 bg-slate-50/50 p-2 dark:border-white/10 dark:bg-black/20">
          <div className="h-[22rem] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 22, right: 24, bottom: 12, left: 0 }}>
                <defs>
                  {visibleSeries.map((item) => (
                    <linearGradient key={item.name} id={`analytics-gradient-${item.tone}-${item.name.replace(/\W+/g, "-")}`} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={tones[item.tone].stroke} stopOpacity={0.26} />
                      <stop offset="85%" stopColor={tones[item.tone].stroke} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="4 8" stroke="rgba(148, 163, 184, 0.28)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 800 }} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 800 }} axisLine={false} tickLine={false} allowDecimals={false} width={36} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#cbd5e1", strokeDasharray: "5 6" }} />
                {visibleSeries.map((item) => (
                  <Area
                    key={item.name}
                    type="monotone"
                    dataKey={item.name}
                    stroke={tones[item.tone].stroke}
                    strokeWidth={3}
                    fill={`url(#analytics-gradient-${item.tone}-${item.name.replace(/\W+/g, "-")})`}
                    activeDot={{ r: 5, strokeWidth: 2, fill: "#fff" }}
                    dot={false}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-black/20">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-white/35">Selected range</p>
          <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{total}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-white/45">Total activity</p>
          <div className="mt-5 space-y-4">
            {visibleSeries.map((item) => {
              const itemTotal = item.points.reduce((sum, point) => sum + point.value, 0);
              return (
                <div key={item.name} className="flex items-center justify-between gap-3">
                  <span className={`text-xs font-black uppercase tracking-[0.14em] ${tones[item.tone].text}`}>{item.name}</span>
                  <span className="text-lg font-black text-slate-950 dark:text-white">{itemTotal}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function DynamicBarChart({ title, helper, points }: { title: string; helper: string; points: ChartPoint[] }) {
  const total = points.reduce((sum, point) => sum + point.value, 0);

  return (
    <section className="border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#111] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xl font-black text-slate-950 dark:text-white">{title}</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-white/45">{helper}</p>
        </div>
        <p className="text-3xl font-black text-slate-950 dark:text-white">{total}</p>
      </div>
      <div className="mt-6 h-[19rem] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 10 }}>
            <CartesianGrid strokeDasharray="4 8" stroke="rgba(148, 163, 184, 0.22)" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 800 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis dataKey="label" type="category" width={130} tick={{ fill: "#64748b", fontSize: 12, fontWeight: 900 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(220, 38, 38, 0.05)" }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22}>
              {points.map((point, index) => (
                <Cell key={point.label} fill={index % 3 === 1 ? "#64748b" : index % 3 === 2 ? "#059669" : "#dc2626"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function FunnelChart({ points, title, helper }: { points: ChartPoint[]; title: string; helper: string }) {
  const base = Math.max(1, points[0]?.value ?? 1);

  return (
    <section className="border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#111] sm:p-6">
      <p className="text-xl font-black text-slate-950 dark:text-white">{title}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-white/45">{helper}</p>
      <div className="mt-6 grid gap-3 lg:grid-cols-4">
        {points.map((point, index) => {
          const rate = Math.round((point.value / base) * 100);
          return (
            <div key={point.label} className="relative min-h-36 overflow-hidden border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/20">
              <div className="absolute inset-x-0 bottom-0 bg-red-600/15" style={{ height: `${Math.max(8, rate)}%` }} />
              <div className="relative">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600 dark:text-red-300">Step {index + 1}</p>
                <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{rate}%</p>
                <p className="mt-2 text-sm font-black text-slate-800 dark:text-slate-100">{point.label}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-white/45">{point.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function AdminAnalyticsCharts({
  pulseSeries,
  engagementBars,
  conversionBars,
  pulseTitle = "30-day platform pulse",
  pulseHelper = "Live trend data from signups, profile attention and message activity.",
  engagementTitle = "Engagement mix",
  engagementHelper = "Last 30 days by action type.",
  funnelTitle = "Conversion funnel",
  funnelHelper = "Current account progression from signup through public, useful profiles."
}: AdminAnalyticsChartsProps) {
  return (
    <div className="space-y-5">
      <LinePulseChart series={pulseSeries} title={pulseTitle} helper={pulseHelper} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <DynamicBarChart title={engagementTitle} helper={engagementHelper} points={engagementBars} />
        <FunnelChart points={conversionBars} title={funnelTitle} helper={funnelHelper} />
      </div>
    </div>
  );
}
