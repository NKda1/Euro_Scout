interface AdminStatCardProps {
  label: string;
  value: number | string;
  detail?: string;
}

export default function AdminStatCard({ label, value, detail }: AdminStatCardProps) {
  return (
    <div className="rounded-3xl glass-card p-5">
      <p className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">{value}</p>
      <p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</p>
      {detail ? <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{detail}</p> : null}
    </div>
  );
}
