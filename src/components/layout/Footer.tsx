import Link from "next/link";
import { routes } from "@/constants/routes";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-white/10 bg-white/70 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <p className="font-bold text-slate-800 dark:text-white">EuroScout Pro</p>
          <p>European American football league and team intelligence. MVP seed-data build.</p>
        </div>
        <div className="flex flex-wrap gap-3 font-bold text-slate-700 dark:text-slate-300">
          <Link href={routes.home} className="hover:text-red-700 dark:hover:text-red-300">
            Home
          </Link>
          <Link href={routes.leagues} className="hover:text-red-700 dark:hover:text-red-300">
            Leagues
          </Link>
          <Link href={routes.teams} className="hover:text-red-700 dark:hover:text-red-300">
            Teams
          </Link>
        </div>
      </div>
    </footer>
  );
}
