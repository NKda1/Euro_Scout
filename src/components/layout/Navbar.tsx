import Link from "next/link";
import Image from "next/image";
import { routes } from "@/constants/routes";
import { isReservedAdminEmail, type Profile } from "@/lib/auth";
import { getNotificationSummary } from "@/lib/notifications";
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
    ? await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>()
    : { data: null };
  const isAdmin = Boolean(profile?.role === "admin" && isReservedAdminEmail(user?.email));
  const notificationCount = profile ? (await getNotificationSummary(profile)).total : 0;

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white dark:border-white/10 dark:bg-[#090909]">
      <div className="mx-auto flex h-[72px] max-w-[112rem] items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link
          href={routes.home}
          className="flex shrink-0 items-center gap-3 transition-opacity duration-150 hover:opacity-80"
        >
          <Image
            src="/images/Euro_Scout_Logo 2.png"
            alt="EuroScout Pro"
            width={42}
            height={42}
            priority
            className="h-10 w-10 object-contain"
          />
          <span className="hidden sm:block">
            <span className="block text-[13px] font-black uppercase tracking-[0.16em] text-slate-950 dark:text-white">
              EuroScout
            </span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.25em] text-red-500">Pro</span>
          </span>
        </Link>

        {/* Main nav — desktop only (lg+) */}
        <div className="hidden min-w-0 flex-1 justify-center px-4 lg:flex xl:px-8">
          <NavLinks isSignedIn={Boolean(user)} isAdmin={isAdmin} notificationCount={notificationCount} />
        </div>

        {/* Right: CTA + divider + theme + mobile menu */}
        <div className="flex shrink-0 items-center gap-3">
          {user ? (
            <Link
              href={routes.account}
              className="hidden items-center gap-2 bg-red-600 px-5 py-2.5 text-sm font-black text-white transition duration-150 hover:bg-red-700 active:scale-[0.97] lg:flex"
            >
              Account
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          ) : (
            <Link
              href={routes.signIn}
              className="hidden bg-red-600 px-5 py-2.5 text-sm font-black text-white transition duration-150 hover:bg-red-700 active:scale-[0.97] lg:flex"
            >
              Sign In
            </Link>
          )}

          <div className="hidden h-5 w-px bg-slate-200 lg:block dark:bg-white/10" />
          <ThemeToggle />
          <MobileMenu isSignedIn={Boolean(user)} isAdmin={isAdmin} notificationCount={notificationCount} />
        </div>
      </div>
    </nav>
  );
}
