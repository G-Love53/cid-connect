/**
 * Parse the URL fragment (#...) into key/value pairs.
 * Uses first "=" as separator per pair (handles JWT values that contain "=" padding).
 * More defensive than URLSearchParams alone for very long recovery redirects.
 */
export function parseHashFragmentParams(hash: string): Record<string, string> {
  const out: Record<string, string> = {};
  const q = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!q) return out;
  for (const segment of q.split("&")) {
    const eq = segment.indexOf("=");
    if (eq === -1) continue;
    const key = decodeForm(segment.slice(0, eq));
    const value = decodeForm(segment.slice(eq + 1));
    if (key) out[key] = value;
  }
  return out;
}

function decodeForm(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, " "));
  } catch {
    return s;
  }
}

export function getRecoveryTokensFromHash(hash: string): {
  access_token: string;
  refresh_token: string;
} | null {
  const p = parseHashFragmentParams(hash);
  const access_token = p.access_token;
  const refresh_token = p.refresh_token;
  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token };
}

/** Decode JWT payload only (no signature verify). Used for recovery UX hints. */
export function decodeJwtPayloadUnsafe(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    if (pad) b64 += "=".repeat(4 - pad);
    const json = atob(b64);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Extra context when session recovery fails (wrong Netlify env vs DatabasePad project, expired session JWT).
 * The email's verify link uses a different JWT than the #access_token after redirect.
 */
export function recoveryJwtHint(accessToken: string, configuredSupabaseUrl: string): string {
  const p = decodeJwtPayloadUnsafe(accessToken);
  if (!p) return "";

  const now = Math.floor(Date.now() / 1000);
  const exp = typeof p.exp === "number" ? p.exp : null;
  const iss = typeof p.iss === "string" ? p.iss : null;
  const projectId = typeof p.projectId === "string" ? p.projectId : null;

  const parts: string[] = [];
  if (exp !== null && exp < now) {
    parts.push("This session token is past its expiry — request a new reset email.");
  }
  if (projectId && configuredSupabaseUrl && !configuredSupabaseUrl.includes(projectId)) {
    parts.push(
      `This token is for project "${projectId}" but VITE_SUPABASE_URL does not contain that id — use the DatabasePad URL and anon key for that project in Netlify.`,
    );
  }
  if (iss) {
    parts.push(`Session JWT iss: ${iss}.`);
  }
  return parts.length ? `\n\n${parts.join(" ")}` : "";
}
