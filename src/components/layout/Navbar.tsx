import Link from "next/link";
import { routes } from "@/constants/routes";
import { isReservedAdminEmail } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ThemeToggle from "@/components/layout/ThemeToggle";
import MobileMenu from "@/components/layout/MobileMenu";
import NavLinks from "@/components/layout/NavLinks";

export default async function Navbar() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: string }>()
    : { data: null };
  const isAdmin = Boolean(profile?.role === "admin" && isReservedAdminEmail(user?.email));

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 shadow-sm shadow-slate-950/[0.04] backdrop-blur-2xl dark:border-white/[0.08] dark:bg-[#060914]/90 dark:shadow-black/20">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link
          href={routes.home}
          className="flex shrink-0 items-center gap-2.5 transition-opacity duration-150 hover:opacity-80"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-red-500 to-red-700 text-[12px] font-black text-white shadow-lg shadow-red-600/30">
            ES
          </span>
          <span className="hidden sm:block">
            <span className="block text-[13px] font-black uppercase tracking-[0.16em] text-slate-950 dark:text-white">
              EuroScout
            </span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.25em] text-red-500">Pro</span>
          </span>
        </Link>

        {/* Pill nav — centered, desktop only (lg+) */}
        <div className="absolute left-1/2 hidden -translate-x-1/2 lg:block">
          <NavLinks isSignedIn={Boolean(user)} isAdmin={isAdmin} />
        </div>

        {/* Right: CTA + divider + theme + mobile menu */}
        <div className="flex shrink-0 items-center gap-2">
          {user ? (
            <Link
              href={routes.dashboard}
              className="hidden items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-[13px] font-black text-white shadow-md shadow-red-600/25 transition duration-150 hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/30 active:scale-[0.97] lg:flex"
            >
              Dashboard
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          ) : (
            <Link
              href={routes.signIn}
              className="hidden rounded-full bg-red-600 px-4 py-2 text-[13px] font-black text-white shadow-md shadow-red-600/25 transition duration-150 hover:bg-red-700 active:scale-[0.97] lg:flex"
            >
              Sign In
            </Link>
          )}

          <div className="hidden h-5 w-px bg-slate-200 lg:block dark:bg-white/10" />
          <ThemeToggle />
          <MobileMenu isSignedIn={Boolean(user)} isAdmin={isAdmin} />
        </div>
      </div>
    </nav>
  );
}
