export const COOKIE_CONSENT_STORAGE_KEY = "euroscout-cookie-consent";
export const COOKIE_CONSENT_VERSION = 2;
export const COOKIE_CONSENT_LIFETIME_MS = 180 * 24 * 60 * 60 * 1000;
export const COOKIE_CONSENT_CHANGED_EVENT = "euroscout:cookie-consent-changed";
export const COOKIE_CONSENT_OPEN_EVENT = "euroscout:cookie-consent-open";

export type CookieConsentStatus = "accepted" | "declined";

export interface CookieConsentRecord {
  version: number;
  status: CookieConsentStatus;
  decidedAt: string;
  expiresAt: string;
}

export function readCookieConsent(): CookieConsentRecord | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<CookieConsentRecord>;
    if (
      parsed.version !== COOKIE_CONSENT_VERSION ||
      (parsed.status !== "accepted" && parsed.status !== "declined") ||
      !parsed.expiresAt ||
      Date.parse(parsed.expiresAt) <= Date.now()
    ) {
      window.localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
      return null;
    }

    return parsed as CookieConsentRecord;
  } catch {
    return null;
  }
}

export function writeCookieConsent(status: CookieConsentStatus) {
  const now = new Date();
  const record: CookieConsentRecord = {
    version: COOKIE_CONSENT_VERSION,
    status,
    decidedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + COOKIE_CONSENT_LIFETIME_MS).toISOString()
  };

  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(record));
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_CHANGED_EVENT, { detail: record }));
  return record;
}
