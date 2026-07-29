"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "euroscout-cookie-consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) setVisible(true);
    } catch {
      // localStorage not available
    }
  }, []);

  function accept() {
    try { localStorage.setItem(STORAGE_KEY, "accepted"); } catch { /* noop */ }
    setVisible(false);
  }

  function decline() {
    try { localStorage.setItem(STORAGE_KEY, "declined"); } catch { /* noop */ }
    setVisible(false);
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
            onClick={decline}
            className="h-10 px-5 text-sm font-black text-slate-600 transition hover:text-red-600 dark:text-slate-300 dark:hover:text-red-400"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="h-10 bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
