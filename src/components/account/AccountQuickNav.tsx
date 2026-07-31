"use client";

import Link from "next/link";
import { Building2, CircleUserRound, LayoutDashboard, MessageSquare, Newspaper, Settings, Target, WalletCards } from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  badge?: number | null;
  href?: string;
}

const iconByLabel = {
  Overview: LayoutDashboard,
  Profile: CircleUserRound,
  Organisation: Building2,
  Recruitment: Target,
  Communication: MessageSquare,
  Publishing: Newspaper,
  Membership: WalletCards,
  Settings
};

function NavIcon({ label }: { label: string }) {
  const Icon = iconByLabel[label as keyof typeof iconByLabel];
  return Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null;
}

export default function AccountQuickNav({ items }: { items: NavItem[] }) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav aria-label="Account workspace" className="sticky top-0 z-20 flex overflow-x-auto border-b border-slate-200 bg-slate-50/95 backdrop-blur-xl dark:border-white/10 dark:bg-black/80">
      <div className="flex min-w-max items-center gap-1 px-2 py-1.5 sm:px-4">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href ?? `#${item.id}`}
            onClick={item.href ? undefined : (event) => handleClick(event, item.id)}
            className="relative inline-flex h-11 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-[11px] font-black text-slate-600 transition hover:bg-white hover:text-red-700 dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white sm:h-9 sm:px-3 sm:text-xs"
          >
            <NavIcon label={item.label} />
            {item.label}
            {item.badge ? (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
                {item.badge}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </nav>
  );
}
