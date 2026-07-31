import Link from "next/link";
import { KeyRound, LockKeyhole, Mail, ShieldCheck, Trash2 } from "lucide-react";

export default function AccountSettingsPanel({ email, provider }: { email: string; provider?: string | null }) {
  const items = [
    { icon: KeyRound, label: "Password", value: "Send a secure reset link", href: "/auth/forgot-password" },
    { icon: ShieldCheck, label: "Authentication", value: provider ? `${provider} connected` : "Email and password", href: "/auth/forgot-password" },
    { icon: LockKeyhole, label: "Privacy", value: "Review visibility and data use", href: "/privacy" },
    { icon: Mail, label: "Account email", value: email, href: "mailto:info@euroscoutpro.com?subject=EuroScout%20account%20email%20change" }
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 dark:divide-white/10 dark:border-white/10">
        {items.map(({ icon: Icon, label, value, href }) => (
          <Link key={label} href={href} className="flex items-center gap-3 bg-white px-4 py-3 transition hover:bg-slate-50 dark:bg-black/20 dark:hover:bg-white/[0.04]">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/55"><Icon className="h-4 w-4" aria-hidden /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-black text-slate-950 dark:text-white">{label}</span>
              <span className="block truncate text-xs font-semibold text-slate-500 dark:text-white/40">{value}</span>
            </span>
            <span aria-hidden className="text-slate-300 dark:text-white/20">→</span>
          </Link>
        ))}
      </div>
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-500/25 dark:bg-red-500/10">
        <div className="flex items-center gap-2 text-red-700 dark:text-red-200"><Trash2 className="h-4 w-4" aria-hidden /><p className="text-xs font-black uppercase tracking-[0.12em]">Delete account</p></div>
        <p className="mt-2 text-xs font-semibold leading-5 text-red-800/75 dark:text-red-100/65">Account deletion is manually verified to protect club ownership, billing records and active recruitment conversations.</p>
        <a href="mailto:privacy@euroscoutpro.com?subject=Delete%20my%20EuroScout%20Pro%20account" className="mt-3 inline-flex h-9 items-center rounded-md border border-red-300 bg-white px-3 text-xs font-black text-red-700 transition hover:bg-red-600 hover:text-white dark:border-red-400/30 dark:bg-transparent dark:text-red-100">
          Request deletion
        </a>
      </div>
    </div>
  );
}
