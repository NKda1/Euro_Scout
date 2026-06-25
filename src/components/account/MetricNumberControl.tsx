"use client";

import { useMemo, useState } from "react";

interface MetricNumberControlProps {
  name: string;
  label: string;
  defaultValue?: string | number | null;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  helper?: string;
}

export default function MetricNumberControl({
  name,
  label,
  defaultValue,
  min,
  max,
  step = 1,
  unit,
  helper
}: MetricNumberControlProps) {
  const initialValue = useMemo(() => {
    const parsed = Number(defaultValue ?? "");
    return Number.isFinite(parsed) ? String(parsed) : "";
  }, [defaultValue]);
  const [value, setValue] = useState(initialValue);
  const rangeValue = value === "" ? min : Number(value);

  return (
    <label className="block rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-black/25">
      <span className="mb-2 block text-xs font-black uppercase text-slate-500 dark:text-white/35">{label}</span>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={rangeValue}
          onChange={(event) => setValue(event.target.value)}
          className="h-2 flex-1 accent-red-600"
        />
        <div className="flex h-11 w-32 items-center border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/35">
          <input
            name={name}
            type="number"
            min={min}
            max={max}
            step="any"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm font-black text-slate-950 outline-none dark:text-white"
          />
          {unit ? <span className="pr-3 text-xs font-black uppercase text-slate-500 dark:text-white/35">{unit}</span> : null}
        </div>
      </div>
      {helper ? <span className="mt-2 block text-xs font-semibold text-slate-500 dark:text-white/35">{helper}</span> : null}
    </label>
  );
}
