/** Canonical production origin for Connect (override via VITE_SITE_URL on Netlify). */
export const DEFAULT_PUBLIC_SITE_ORIGIN =
  "https://connect.commercialinsurance-direct.com";

/** Public origin for auth redirect links (password recovery, etc.). */
export function getPublicSiteOrigin(): string {
  const fromEnv = import.meta.env.VITE_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  return DEFAULT_PUBLIC_SITE_ORIGIN;
}

/** Hostname shown in PWA install instructions (no protocol). */
export function getPublicSiteHostname(): string {
  try {
    return new URL(getPublicSiteOrigin()).hostname;
  } catch {
    return new URL(DEFAULT_PUBLIC_SITE_ORIGIN).hostname;
  }
}

/** Full URL for password recovery (must match Auth redirect allowlist + React route `/reset-password`). */
export function getPasswordResetRedirectUrl(): string | undefined {
  const origin = getPublicSiteOrigin();
  return origin ? `${origin}/reset-password` : undefined;
}
