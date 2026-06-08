export default function MapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 bg-white px-4 py-3 text-xs font-semibold text-slate-500 dark:bg-[#111] dark:text-white/55">
      <span className="inline-flex items-center gap-2">
        <span className="h-3 w-3 bg-red-600" />
        Active region
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-3 w-3 bg-red-500/45 ring-1 ring-red-300/60" />
        Data available
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-3 w-3 bg-slate-300 dark:bg-slate-700" />
        Not covered yet
      </span>
    </div>
  );
}
