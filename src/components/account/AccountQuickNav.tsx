"use client";

interface NavItem {
  id: string;
  label: string;
  badge?: number | null;
}

export default function AccountQuickNav({ items }: { items: NavItem[] }) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className="flex overflow-x-auto border-b border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/30">
      <div className="flex min-w-max items-center gap-1 px-4 py-2 sm:px-5">
        <span className="mr-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-white/25">Jump to</span>
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(e) => handleClick(e, item.id)}
            className="relative inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:bg-white/5 dark:text-white/55 dark:hover:border-red-500/40 dark:hover:text-white"
          >
            {item.label}
            {item.badge ? (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
                {item.badge}
              </span>
            ) : null}
          </a>
        ))}
      </div>
    </nav>
  );
}
