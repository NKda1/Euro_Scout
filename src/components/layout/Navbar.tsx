import Link from "next/link";
import { routes } from "@/constants/routes";
import { isReservedAdminEmail } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ThemeToggle from "@/components/layout/ThemeToggle";

export default async function Navbar() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: string }>() : { data: null };

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/88 shadow-sm shadow-slate-950/5 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/92 dark:shadow-black/20">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={routes.home} className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-sm font-black text-white shadow-lg shadow-red-600/25">ES</span>
          <span>
            <span className="block text-sm font-black uppercase tracking-[0.16em] text-slate-950 dark:text-white">EuroScout</span>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-red-600">Pro</span>
          </span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link href={routes.home} className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-500/10 dark:hover:text-red-300 sm:px-4">
            Home
          </Link>
          <Link href={routes.leagues} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-500/10 dark:hover:text-red-300">
            Leagues
          </Link>
          <Link href={routes.teams} className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-500/10 dark:hover:text-red-300 sm:px-4">
            Teams
          </Link>
          <Link href={routes.players} className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-500/10 dark:hover:text-red-300 sm:px-4">
            Players
          </Link>
          <Link href={routes.scouts} className="hidden rounded-xl px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-500/10 dark:hover:text-red-300 md:inline-flex sm:px-4">
            Scouts
          </Link>
          {user ? (
            <>
              <Link href={routes.profiles} className="hidden rounded-xl px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-500/10 dark:hover:text-red-300 sm:inline-flex sm:px-4">
                Profiles
              </Link>
              <Link href={routes.messages} className="hidden rounded-xl px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-500/10 dark:hover:text-red-300 sm:inline-flex sm:px-4">
                Messages
              </Link>
              {profile?.role === "admin" && isReservedAdminEmail(user.email) ? (
                <Link href={routes.admin} className="hidden rounded-xl px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-500/10 dark:hover:text-red-300 lg:inline-flex sm:px-4">
                  Admin
                </Link>
              ) : null}
              <Link href={routes.dashboard} className="rounded-xl bg-red-600 px-3 py-2 text-sm font-black text-white transition hover:bg-red-700 sm:px-4">
                Dashboard
              </Link>
            </>
          ) : (
            <Link href={routes.signIn} className="rounded-xl bg-red-600 px-3 py-2 text-sm font-black text-white transition hover:bg-red-700 sm:px-4">
              Sign In
            </Link>
          )}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
