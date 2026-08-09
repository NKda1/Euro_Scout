export const TERMS_VERSION = "2026-08-08";
export const PRIVACY_VERSION = "2026-08-08";
export const PENDING_LEGAL_CONSENT_COOKIE = "esp_pending_legal_consent";

export type PendingLegalConsent = {
  termsVersion: string;
  privacyVersion: string;
  acceptedAt: string;
};
