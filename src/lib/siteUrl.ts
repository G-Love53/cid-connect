/** Public origin for auth redirect links (password recovery, etc.). */
export function getPublicSiteOrigin(): string {
  const fromEnv = import.meta.env.VITE_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}
