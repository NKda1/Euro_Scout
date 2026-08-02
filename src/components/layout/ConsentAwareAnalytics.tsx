"use client";

import { Analytics } from "@vercel/analytics/next";
import { useEffect, useState } from "react";
import { COOKIE_CONSENT_CHANGED_EVENT, readCookieConsent } from "@/lib/consent";

export default function ConsentAwareAnalytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const sync = () => setEnabled(readCookieConsent()?.status === "accepted");
    sync();
    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return enabled ? <Analytics /> : null;
}
