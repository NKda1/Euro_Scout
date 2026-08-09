import Link from "next/link";
import { routes } from "@/constants/routes";
import BugReportDialog from "@/components/layout/BugReportDialog";

const navLinks = [
  { href: routes.home, label: "Home" },
  { href: routes.leagues, label: "Leagues" },
  { href: routes.teams, label: "Clubs" },
  { href: routes.campusToPro, label: "Campus to Pro" },
  { href: routes.news, label: "News" },
  { href: "/players", label: "Players" },
];

const legalLinks = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/cookies", label: "Cookie Policy" },
];

export default function Footer() {
  return (
    <footer className="site-footer border-t border-slate-200 bg-white dark:border-white/10 dark:bg-[#090909]">
      <div className="mx-auto max-w-[92rem] px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-[1.35fr_1fr_1fr] sm:items-start lg:grid-cols-[1.5fr_1fr_1fr_auto]">

          {/* Brand */}
          <div className="lg:col-span-1">
            <p className="text-lg font-black tracking-tight text-slate-950 dark:text-white">
              EURO<span className="text-red-600">SCOUT</span> PRO
            </p>
            <p className="mt-1 max-w-md text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
              European American football intelligence for players, clubs and coaches.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Platform</p>
            <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:block sm:space-y-1">
              {navLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-xs font-bold text-slate-600 transition hover:text-red-600 dark:text-slate-300 dark:hover:text-red-400">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Legal</p>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 sm:block sm:space-y-1">
              {legalLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-xs font-bold text-slate-600 transition hover:text-red-600 dark:text-slate-300 dark:hover:text-red-400">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Contact</p>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2 sm:block sm:space-y-2">
              <li>
                <BugReportDialog />
              </li>
              <li>
                <a
                  href="mailto:info@euroscoutpro.com"
                  className="flex items-center gap-2 text-xs font-bold text-slate-600 transition hover:text-red-600 dark:text-slate-300 dark:hover:text-red-400"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  info@euroscoutpro.com
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com/euroscout.pro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs font-bold text-slate-600 transition hover:text-red-600 dark:text-slate-300 dark:hover:text-red-400"
                >
                  <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  @euroscout.pro
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-1.5 border-t border-slate-200 pt-2 dark:border-white/10">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()} EuroScout Pro · All rights reserved
          </p>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
            Built for European American football
          </p>
        </div>
      </div>
    </footer>
  );
}
