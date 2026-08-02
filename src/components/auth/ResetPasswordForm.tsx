import { resetPasswordAction } from "@/app/actions/auth";
import PasswordInput from "@/components/auth/PasswordInput";
import PendingSubmitButton from "@/components/forms/PendingSubmitButton";

const labelClass = "text-sm font-black uppercase tracking-wide text-slate-600 dark:text-slate-300";

interface ResetPasswordFormProps {
  error?: string;
}

export default function ResetPasswordForm({ error }: ResetPasswordFormProps) {
  return (
    <>
      {error ? (
        <p className="mb-4 rounded-2xl border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-800 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </p>
      ) : null}
      <form action={resetPasswordAction} className="space-y-4">
        <label className="block">
          <span className={labelClass}>New password</span>
          <PasswordInput name="password" required minLength={8} autoComplete="new-password" />
        </label>
        <label className="block">
          <span className={labelClass}>Confirm new password</span>
          <PasswordInput name="confirm_password" required minLength={8} autoComplete="new-password" />
        </label>
        <PendingSubmitButton pendingLabel="Updating password…" className="h-12 w-full rounded-2xl bg-red-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-70">
          Update password
        </PendingSubmitButton>
      </form>
    </>
  );
}
