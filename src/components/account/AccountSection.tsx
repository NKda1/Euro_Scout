"use client";

import { useState, useId } from "react";
import { ChevronDown } from "lucide-react";

interface AccountSectionProps {
  id?: string;
  eyebrow: string;
  title: string;
  badge?: string | number | null;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function AccountSection({ id, eyebrow, title, badge, defaultOpen, children }: AccountSectionProps) {
  const [open, setOpen] = useState(defaultOpen !== false);
  const bodyId = useId();

  return (
    <section id={id} className="scroll-mt-16 border-b border-slate-200 bg-white dark:border-white/10 dark:bg-[#111]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-4 px-4 py-5 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.02] sm:px-5"
      >
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-red-500">{eyebrow}</p>
            <h2 className="mt-0.5 text-xl font-black tracking-tight text-slate-950 dark:text-white">{title}</h2>
          </div>
          {badge ? (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-black text-white">
              {badge}
            </span>
          ) : null}
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 dark:text-white/35 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div id={bodyId} className={open ? "px-4 pb-6 sm:px-5" : "hidden"}>
        {children}
      </div>
    </section>
  );
}
