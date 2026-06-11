"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { routes } from "@/constants/routes";
import { cn } from "@/lib/utils";

interface NavLinksProps {
  isSignedIn: boolean;
  isAdmin: boolean;
}

export default function NavLinks({ isSignedIn, isAdmin }: NavLinksProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    return href === routes.home ? pathname === href : pathname.startsWith(href);
  }

  function linkCls(href: string, extra?: string) {
    return cn(
      "px-2.5 py-1.5 text-[12px] font-bold transition-all duration-150 xl:px-3",
      isActive(href)
        ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
        : "text-slate-600 hover:bg-red-50 hover:text-red-700 dark:text-slate-300 dark:hover:bg-red-500/10 dark:hover:text-red-300",
      extra
    );
  }

  return (
    <div className="flex items-center gap-0.5 border border-slate-200 bg-white px-1.5 py-1.5 dark:border-white/10 dark:bg-[#111]">
      <Link href={routes.home} className={linkCls(routes.home)}>Home</Link>
      <Link href={routes.leagues} className={linkCls(routes.leagues)}>League directories</Link>
      <Link href={routes.teams} className={linkCls(routes.teams)}>Team directories</Link>
      <Link href={routes.players} className={linkCls(routes.players)}>Players</Link>
      <Link href={routes.campusToPro} className={linkCls(routes.campusToPro, "hidden xl:inline-flex")}>Campus to Pro</Link>
      <Link href={routes.news} className={linkCls(routes.news, "hidden xl:inline-flex")}>News</Link>
      <Link href={routes.scouts} className={linkCls(routes.scouts)}>Clubs</Link>
      {isSignedIn && (
        <>
          <Link href={routes.messages} className={linkCls(routes.messages, "hidden xl:inline-flex")}>
            Messages
          </Link>
          {isAdmin && (
            <Link href={routes.admin} className={linkCls(routes.admin, "hidden 2xl:inline-flex")}>
              Admin
            </Link>
          )}
        </>
      )}
    </div>
  );
}
