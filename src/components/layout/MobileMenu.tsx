"use client";

import { useState } from "react";
import Link from "next/link";
import { routes } from "@/constants/routes";

interface MobileMenuProps {
  isSignedIn: boolean;
  isAdmin: boolean;
  notificationCount?: number;
}

export default function MobileMenu({ isSignedIn, isAdmin, notificationCount = 0 }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center justify-center border border-slate-200 p-2 text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-white/10 dark:text-slate-200 dark:hover:bg-red-500/10 dark:hover:text-red-300 lg:hidden"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        {open ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {open && (
        <div className="animate-slide-down absolute inset-x-0 top-16 z-50 border-b border-slate-200 bg-white dark:border-white/10 dark:bg-[#090909] lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6">
            <Link href={routes.home} onClick={close} className="px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-500/10 dark:hover:text-red-300">
              Home
            </Link>
            <Link href={routes.leagues} onClick={close} className="px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-500/10 dark:hover:text-red-300">
              League directories
            </Link>
            <Link href={routes.teams} onClick={close} className="px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-500/10 dark:hover:text-red-300">
              Club directory
            </Link>
            <Link href={routes.players} onClick={close} className="px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-500/10 dark:hover:text-red-300">
              Players
            </Link>
            <Link href={routes.campusToPro} onClick={close} className="px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-500/10 dark:hover:text-red-300">
              Campus to Pro
            </Link>
            <Link href={routes.news} onClick={close} className="px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-500/10 dark:hover:text-red-300">
              News
            </Link>
            {isSignedIn && (
              <>
                <Link href={routes.messages} onClick={close} className="px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-500/10 dark:hover:text-red-300">
                  Messages
                </Link>
                <Link href={routes.notifications} onClick={close} className="flex items-center justify-between px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-500/10 dark:hover:text-red-300">
                  <span>Notifications</span>
                  {notificationCount ? (
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-black text-white">
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </span>
                  ) : null}
                </Link>
                {isAdmin && (
                  <Link href={routes.admin} onClick={close} className="px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-500/10 dark:hover:text-red-300">
                    Admin
                  </Link>
                )}
                <div className="mt-1 border-t border-slate-100 pt-2 dark:border-white/10">
                  <Link href={routes.account} onClick={close} className="block bg-red-600 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-red-700">
                    Account
                  </Link>
                </div>
              </>
            )}
            {!isSignedIn && (
              <div className="mt-1 border-t border-slate-100 pt-2 dark:border-white/10">
                <Link href={routes.signIn} onClick={close} className="block bg-red-600 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-red-700">
                  Sign In
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
