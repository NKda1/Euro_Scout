export default function MapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
      <span className="inline-flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-red-600" />
        Active region
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-red-100 ring-1 ring-red-200" />
        Data available
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-slate-200" />
        Not covered yet
      </span>
    </div>
  );
}
