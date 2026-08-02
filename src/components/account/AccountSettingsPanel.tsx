import { KeyRound, LockKeyhole, Mail, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { deleteOwnAccountAction, updateAccountEmailAction, updateAccountPasswordAction, updateAccountPrivacyAction } from "@/app/actions/account-settings";
import PendingSubmitButton from "@/components/forms/PendingSubmitButton";

const inputClass = "mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:border-white/15 dark:bg-black/30 dark:text-white dark:focus:ring-red-500/20";
const summaryClass = "flex cursor-pointer list-none items-center gap-3 px-4 py-3 marker:hidden [&::-webkit-details-marker]:hidden";

function SettingHeading({ icon: Icon, label, value }: { icon: typeof KeyRound; label: string; value: string }) {
  return <><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/60"><Icon className="h-4 w-4" aria-hidden /></span><span className="min-w-0 flex-1"><span className="block text-sm font-black text-slate-950 dark:text-white">{label}</span><span className="block truncate text-xs font-semibold text-slate-500 dark:text-white/45">{value}</span></span><span className="text-slate-400" aria-hidden>⌄</span></>;
}

export default function AccountSettingsPanel({ email, provider, isPublic = false, hasPasswordIdentity = true }: { email: string; provider?: string | null; isPublic?: boolean; hasPasswordIdentity?: boolean }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-black/20">
        <details>
          <summary className={summaryClass}><SettingHeading icon={Mail} label="Account email" value={email} /></summary>
          <form action={updateAccountEmailAction} className="border-t border-slate-100 px-4 pb-4 pt-3 dark:border-white/10">
            <label className="text-xs font-black uppercase tracking-wide text-slate-600 dark:text-white/55">New email<input name="email" type="email" required autoComplete="email" className={inputClass} /></label>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-500 dark:text-white/40">For security, Supabase confirms the change by email before replacing your sign-in address.</p>
            <PendingSubmitButton pendingLabel="Sending confirmation…" className="mt-3 h-10 rounded-lg bg-red-600 px-4 text-xs font-black text-white hover:bg-red-700 disabled:opacity-70">Change email</PendingSubmitButton>
          </form>
        </details>

        <details>
          <summary className={summaryClass}><SettingHeading icon={KeyRound} label="Password" value="Change securely in place" /></summary>
          {hasPasswordIdentity ? <form action={updateAccountPasswordAction} className="grid gap-3 border-t border-slate-100 px-4 pb-4 pt-3 dark:border-white/10 sm:grid-cols-2">
            <label className="text-xs font-black uppercase tracking-wide text-slate-600 dark:text-white/55 sm:col-span-2">Current password<input name="current_password" type="password" required autoComplete="current-password" className={inputClass} /></label>
            <label className="text-xs font-black uppercase tracking-wide text-slate-600 dark:text-white/55">New password<input name="password" type="password" minLength={8} maxLength={72} required autoComplete="new-password" className={inputClass} /></label>
            <label className="text-xs font-black uppercase tracking-wide text-slate-600 dark:text-white/55">Confirm password<input name="confirm_password" type="password" minLength={8} maxLength={72} required autoComplete="new-password" className={inputClass} /></label>
            <PendingSubmitButton pendingLabel="Updating password…" className="h-10 rounded-lg bg-red-600 px-4 text-xs font-black text-white hover:bg-red-700 disabled:opacity-70 sm:w-fit">Update password</PendingSubmitButton>
          </form> : (
            <div className="border-t border-slate-100 px-4 pb-4 pt-3 dark:border-white/10">
              <p className="text-xs font-semibold leading-5 text-slate-500 dark:text-white/45">This account signs in with {provider ?? "an external provider"}. Use the secure recovery flow if you want to add an email password.</p>
              <Link href="/auth/forgot-password" className="mt-3 inline-flex h-10 items-center rounded-lg bg-red-600 px-4 text-xs font-black text-white hover:bg-red-700">Set password by email</Link>
            </div>
          )}
        </details>

        <details>
          <summary className={summaryClass}><SettingHeading icon={LockKeyhole} label="Privacy" value={isPublic ? "Public profile" : "Private profile"} /></summary>
          <form action={updateAccountPrivacyAction} className="border-t border-slate-100 px-4 pb-4 pt-3 dark:border-white/10">
            <label className="flex items-start gap-3 text-sm font-bold text-slate-700 dark:text-white/70"><input name="is_public" type="checkbox" defaultChecked={isPublic} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600" /><span>Show my profile in public directories<span className="mt-1 block text-xs font-semibold leading-5 text-slate-500 dark:text-white/40">Turning this off hides your profile; authorised account and club workflows remain available.</span></span></label>
            <PendingSubmitButton pendingLabel="Saving privacy…" className="mt-3 h-10 rounded-lg border border-slate-300 bg-white px-4 text-xs font-black text-slate-700 hover:border-red-400 hover:text-red-700 disabled:opacity-70 dark:border-white/15 dark:bg-white/5 dark:text-white">Save privacy</PendingSubmitButton>
          </form>
        </details>

        <div className="flex items-center gap-3 px-4 py-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/60"><ShieldCheck className="h-4 w-4" aria-hidden /></span><span><span className="block text-sm font-black text-slate-950 dark:text-white">Authentication</span><span className="block text-xs font-semibold text-slate-500 dark:text-white/45">{provider ? `${provider} identity connected` : "Email and password protected"}</span></span></div>
      </div>

      <details className="h-fit rounded-xl border border-red-200 bg-red-50 dark:border-red-500/25 dark:bg-red-500/10">
        <summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-red-700 marker:hidden dark:text-red-200 [&::-webkit-details-marker]:hidden"><Trash2 className="h-4 w-4" aria-hidden /><span className="text-xs font-black uppercase tracking-[0.12em]">Delete account</span><span className="ml-auto" aria-hidden>⌄</span></summary>
        <form action={deleteOwnAccountAction} className="border-t border-red-200 p-4 dark:border-red-500/20">
          <p className="text-xs font-semibold leading-5 text-red-900/75 dark:text-red-100/65">Permanent and irreversible. Active subscriptions must be cancelled and club ownership transferred first.</p>
          <input name="email" type="email" required placeholder={email} aria-label="Confirm account email" className={`${inputClass} border-red-200`} />
          <input name="confirmation" required pattern="DELETE" placeholder="Type DELETE" aria-label="Type DELETE to confirm" className={`${inputClass} border-red-200`} />
          <PendingSubmitButton pendingLabel="Deleting account…" className="mt-3 h-10 w-full rounded-lg bg-red-700 px-4 text-xs font-black text-white hover:bg-red-800 disabled:opacity-70">Delete permanently</PendingSubmitButton>
        </form>
      </details>
    </div>
  );
}
