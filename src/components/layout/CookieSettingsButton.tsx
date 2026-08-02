"use client";

import { COOKIE_CONSENT_OPEN_EVENT } from "@/lib/consent";

export default function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(COOKIE_CONSENT_OPEN_EVENT))}
      className="text-xs font-bold text-slate-600 transition hover:text-red-600 dark:text-slate-300 dark:hover:text-red-400"
    >
      Cookie settings
    </button>
  );
}
