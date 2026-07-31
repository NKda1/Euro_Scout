import Link from "next/link";

export interface CompactFact {
  label: string;
  value: React.ReactNode;
  href?: string | null;
  external?: boolean;
}

interface CompactFactGridProps {
  facts: CompactFact[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export default function CompactFactGrid({ facts, columns = 3, className = "" }: CompactFactGridProps) {
  const columnClass = columns === 4 ? "sm:grid-cols-4" : columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3";

  return (
    <dl className={`grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 bg-slate-200/80 dark:border-white/10 dark:bg-white/10 ${columnClass} ${className}`}>
      {facts.map((fact) => (
        <div key={fact.label} className="min-w-0 bg-white px-3 py-2.5 dark:bg-[#151515]">
          <dt className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-white/35">{fact.label}</dt>
          <dd className="mt-1 min-w-0 break-words text-sm font-black leading-5 text-slate-950 dark:text-white">
            {fact.href ? fact.external ? (
              <a href={fact.href} target="_blank" rel="noopener noreferrer" className="underline decoration-slate-300 underline-offset-2 transition hover:text-red-600 dark:decoration-white/20 dark:hover:text-red-300">
                {fact.value}
              </a>
            ) : (
              <Link href={fact.href} className="underline decoration-slate-300 underline-offset-2 transition hover:text-red-600 dark:decoration-white/20 dark:hover:text-red-300">{fact.value}</Link>
            ) : fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
