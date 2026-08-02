"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  COOKIE_CONSENT_OPEN_EVENT,
  readCookieConsent,
  writeCookieConsent,
  type CookieConsentStatus
} from "@/lib/consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => setVisible(!readCookieConsent());
    const open = () => setVisible(true);
    sync();
    window.addEventListener(COOKIE_CONSENT_OPEN_EVENT, open);
    return () => window.removeEventListener(COOKIE_CONSENT_OPEN_EVENT, open);
  }, []);

  function decide(status: CookieConsentStatus) {
    try {
      writeCookieConsent(status);
      setVisible(false);
    } catch {
      setVisible(true);
    }
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white px-4 py-4 shadow-2xl dark:border-white/10 dark:bg-[#111] sm:px-6"
    >
      <div className="mx-auto flex max-w-[92rem] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          We use essential cookies for authentication and optional analytics cookies to understand how the platform is used.{" "}
          <Link href="/cookies" className="font-black text-red-600 hover:underline dark:text-red-400">
            Cookie Policy
          </Link>
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => decide("declined")}
            className="h-10 rounded-lg border border-slate-300 bg-white px-5 text-sm font-black text-slate-700 transition hover:border-red-300 hover:text-red-700 dark:border-white/15 dark:bg-white/5 dark:text-white"
          >
            Decline optional
          </button>
          <button
            type="button"
            onClick={() => decide("accepted")}
            className="h-10 rounded-lg bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
