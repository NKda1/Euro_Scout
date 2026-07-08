import Link from "next/link";
import { routes } from "@/constants/routes";

export default function Footer() {
  return (
    <footer className="site-footer border-t border-slate-200 bg-white dark:border-white/10 dark:bg-[#090909]">
      <div className="mx-auto flex max-w-[92rem] flex-col gap-4 px-4 py-8 text-sm text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <p className="font-bold text-slate-800 dark:text-white">EuroScout Pro</p>
          <p>European American football league and team intelligence. MVP seed-data build.</p>
        </div>
        <div className="flex flex-wrap gap-3 font-bold text-slate-700 dark:text-slate-300">
          <Link href={routes.home} className="hover:text-red-700 dark:hover:text-red-300">
            Home
          </Link>
          <Link href={routes.leagues} className="hover:text-red-700 dark:hover:text-red-300">
            League directories
          </Link>
          <Link href={routes.teams} className="hover:text-red-700 dark:hover:text-red-300">
            Team directories
          </Link>
          <Link href={routes.campusToPro} className="hover:text-red-700 dark:hover:text-red-300">
            Campus to Pro
          </Link>
          <Link href={routes.news} className="hover:text-red-700 dark:hover:text-red-300">
            News
          </Link>
          <Link href="/privacy" className="hover:text-red-700 dark:hover:text-red-300">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-red-700 dark:hover:text-red-300">
            Terms
          </Link>
          <Link href="/cookies" className="hover:text-red-700 dark:hover:text-red-300">
            Cookies
          </Link>
        </div>
      </div>
    </footer>
  );
}
