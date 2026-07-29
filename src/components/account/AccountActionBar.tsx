import Link from "next/link";
import { ExternalLink, LogOut, Settings } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import ShareProfileButton from "@/components/profiles/ShareProfileButton";

interface AccountActionBarProps {
  publicHref: string;
  displayName: string;
  showSettingsLink?: boolean;
}

export default function AccountActionBar({ publicHref, displayName, showSettingsLink = true }: AccountActionBarProps) {
  const quietAction =
    "inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-xs font-black text-slate-600 transition hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/65 dark:hover:border-red-500/40 dark:hover:text-white sm:h-9 sm:px-3";

  return (
    <div className={`grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center ${showSettingsLink ? "grid-cols-4" : "grid-cols-3"}`} aria-label="Account actions">
      {showSettingsLink ? (
        <Link href="/account#profile" className={quietAction} aria-label="Open account settings">
          <Settings className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Settings</span>
        </Link>
      ) : null}
      <Link href={publicHref} className={quietAction} aria-label="Preview public profile">
        <ExternalLink className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Preview</span>
      </Link>
      <ShareProfileButton
        path={publicHref}
        title={`${displayName} | EuroScout Pro`}
        text={`View ${displayName} on EuroScout Pro.`}
        label="Share"
        compactOnMobile
        className="!h-10 !min-w-0 !rounded-md !px-2 !text-xs sm:!h-9 sm:!px-3"
      />
      <form action={signOutAction}>
        <button type="submit" className={`${quietAction} w-full`} aria-label="Sign out">
          <LogOut className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </form>
    </div>
  );
}
