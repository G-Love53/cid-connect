import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and set values (see docs/DEPLOY.md).",
  );
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // @supabase/auth-js default is "implicit" (not PKCE). Email recovery redirects use the URL *fragment*
    // (#access_token=…&refresh_token=…). If flowType is "pkce", implicit callbacks throw
    // AuthPKCEGrantCodeExchangeError in GoTrueClient._getSessionFromURL — breaking /reset-password.
    // PKCE ?code= also needs a stored code_verifier; a reset link opened from email has no verifier here.
    // Do not set flowType to "pkce" unless the app only uses OAuth flows that establish the verifier first.
    flowType: "implicit",
    storageKey: "cid-connect.supabase.auth",
  },
});

export { supabase };
