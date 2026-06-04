"use client";

import { useState } from "react";
import Link from "next/link";
import { routes } from "@/constants/routes";

interface MobileMenuProps {
  isSignedIn: boolean;
  isAdmin: boolean;
}

export default function MobileMenu({ isSignedIn, isAdmin }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center justify-center rounded-full p-2 text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-500/10 dark:hover:text-red-300 lg:hidden"
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
        <div className="animate-slide-down absolute inset-x-0 top-16 z-50 border-b border-slate-200 bg-white/95 shadow-lg backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/95 lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6">
            <Link href={routes.home} onClick={close} className="rounded-xl px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-500/10 dark:hover:text-red-300">
              Home
            </Link>
            <Link href={routes.leagues} onClick={close} className="rounded-xl px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-500/10 dark:hover:text-red-300">
              Leagues
            </Link>
            <Link href={routes.teams} onClick={close} className="rounded-xl px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-500/10 dark:hover:text-red-300">
              Teams
            </Link>
            <Link href={routes.players} onClick={close} className="rounded-xl px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-500/10 dark:hover:text-red-300">
              Players
            </Link>
            <Link href={routes.scouts} onClick={close} className="rounded-xl px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-500/10 dark:hover:text-red-300">
              Clubs
            </Link>
            {isSignedIn && (
              <>
                <Link href={routes.messages} onClick={close} className="rounded-xl px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-500/10 dark:hover:text-red-300">
                  Messages
                </Link>
                {isAdmin && (
                  <Link href={routes.admin} onClick={close} className="rounded-xl px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-500/10 dark:hover:text-red-300">
                    Admin
                  </Link>
                )}
                <div className="mt-1 border-t border-slate-100 pt-2 dark:border-white/10">
                  <Link href={routes.dashboard} onClick={close} className="block rounded-xl bg-red-600 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-red-700">
                    Dashboard
                  </Link>
                </div>
              </>
            )}
            {!isSignedIn && (
              <div className="mt-1 border-t border-slate-100 pt-2 dark:border-white/10">
                <Link href={routes.signIn} onClick={close} className="block rounded-xl bg-red-600 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-red-700">
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
