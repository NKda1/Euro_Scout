import Link from "next/link";
import { routes } from "@/constants/routes";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={routes.home} className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-sm font-black text-white shadow-sm">ES</span>
          <span>
            <span className="block text-sm font-black uppercase tracking-[0.16em] text-slate-950">EuroScout</span>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-red-600">Pro</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href={routes.leagues} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-700">
            Leagues
          </Link>
        </div>
      </div>
    </nav>
  );
}
