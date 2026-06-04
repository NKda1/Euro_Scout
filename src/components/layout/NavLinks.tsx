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
      "rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-all duration-150",
      isActive(href)
        ? "bg-white text-slate-950 shadow-sm dark:bg-white/[0.12] dark:text-white"
        : "text-slate-600 hover:bg-white/80 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white",
      extra
    );
  }

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-slate-200/80 bg-slate-100/60 px-1.5 py-1.5 shadow-sm backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/[0.04]">
      <Link href={routes.home} className={linkCls(routes.home)}>Home</Link>
      <Link href={routes.leagues} className={linkCls(routes.leagues)}>Leagues</Link>
      <Link href={routes.teams} className={linkCls(routes.teams)}>Teams</Link>
      <Link href={routes.players} className={linkCls(routes.players)}>Players</Link>
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
