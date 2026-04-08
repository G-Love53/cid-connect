import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getRecoveryTokensFromHash, recoveryJwtHint } from "@/lib/authRecoveryHash";
import { Lock, ArrowRight, Eye, EyeOff } from "lucide-react";

type Phase = "checking" | "ready" | "invalid";

/** Recovery redirects include long JWTs in the hash; auth may call /user and take several seconds. */
const RECOVERY_FAIL_AFTER_MS = 60_000;

/**
 * Supabase recovery: email links to this path; tokens are in the URL hash.
 * redirectTo must be allowlisted (e.g. https://cid-connect.netlify.app/reset-password).
 */
const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [phase, setPhase] = useState<Phase>("checking");
  /** Set when initialize() fails (wrong project key, expired token, network) — not generic "expired" only. */
  const [initError, setInitError] = useState<string | null>(null);
  const established = useRef(false);

  useEffect(() => {
    let cancelled = false;

    // Snapshot before any await: initialize() may clear the fragment on success; we still need tokens
    // for setSession fallback if the automatic parse path fails without clearing the hash.
    const hashSnapshot = typeof window !== "undefined" ? window.location.hash : "";
    const searchSnapshot = typeof window !== "undefined" ? window.location.search : "";

    const markReady = () => {
      if (!established.current) {
        established.current = true;
        setPhase("ready");
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") markReady();
      if (session && (event === "INITIAL_SESSION" || event === "SIGNED_IN")) {
        const h = typeof window !== "undefined" ? window.location.hash : "";
        if (h.includes("type=recovery") || h.includes("access_token")) markReady();
      }
    });

    const hasRecoveryHash =
      hashSnapshot.includes("access_token") || hashSnapshot.includes("type=recovery");

    const configuredSupabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";

    void (async () => {
      const { error: initErr } = await supabase.auth.initialize();
      if (cancelled) return;

      let { data: { session } } = await supabase.auth.getSession();
      const tokens = getRecoveryTokensFromHash(hashSnapshot);

      const withJwtHint = (msg: string) =>
        msg + (tokens?.access_token ? recoveryJwtHint(tokens.access_token, configuredSupabaseUrl) : "");

      // If GoTrue didn't attach a session from the URL (parser edge cases on very long hashes),
      // establish the session explicitly from the fragment.
      if (!session && tokens) {
        const { data, error: setErr } = await supabase.auth.setSession({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        });
        if (data.session) {
          session = data.session;
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        } else if (setErr) {
          setInitError(withJwtHint(initErr?.message ?? setErr.message));
          setPhase("invalid");
          return;
        }
      }

      if (cancelled) return;
      if (initErr && !session) {
        setInitError(withJwtHint(initErr.message));
        setPhase("invalid");
        return;
      }
      if (session) markReady();
    })();

    // Hash parsing + /user validation can lag; stagger retries for slow networks.
    if (hasRecoveryHash) {
      for (const ms of [80, 250, 600, 1500, 4000, 10000]) {
        window.setTimeout(() => {
          if (cancelled) return;
          void supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) markReady();
          });
        }, ms);
      }
    }

    const failTimer = window.setTimeout(() => {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (cancelled) return;
        if (!established.current) {
          if (session) markReady();
          else {
            const qp = new URLSearchParams(searchSnapshot.startsWith("?") ? searchSnapshot.slice(1) : searchSnapshot);
            if (qp.has("code") && !qp.has("error")) {
              setInitError(
                "This URL has a ?code= parameter but no session was established. PKCE exchange requires a code_verifier stored in this browser when the flow started; password-reset links from email almost always use implicit tokens in the hash (#access_token=…), not PKCE. Do not set flowType to pkce for this app.",
              );
            }
            setPhase("invalid");
          }
        }
      });
    }, hasRecoveryHash ? RECOVERY_FAIL_AFTER_MS : 12_000);

    return () => {
      cancelled = true;
      window.clearTimeout(failTimer);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
      } else {
        setMessage("Password updated. Redirecting to sign in…");
        setTimeout(() => {
          void supabase.auth.signOut();
          navigate("/", { replace: true });
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-[#0a1f35] via-[#1B3A5F] to-[#152d4a]">
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex items-center justify-center opacity-[0.07]">
        <span className="text-[min(22vw,190px)] font-black text-white tracking-[0.15em]">CID</span>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-[#1B3A5F] to-[#2C5282] p-6 text-center">
            <h1 className="text-white text-lg font-semibold">Set a new password</h1>
            <p className="text-blue-200 text-sm mt-2">Use the link from your email</p>
          </div>

          <div className="p-6">
            {phase === "checking" && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Verifying your reset link…</p>
                <p className="text-xs text-gray-500">
                  This step can take 10–15 seconds — the link contains a long token and your browser talks to the auth server to confirm it.
                </p>
              </div>
            )}
            {phase === "invalid" && (
              <div className="space-y-4">
                {initError ? (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    <span className="font-medium text-gray-900">Could not use this link.</span>{" "}
                    {initError}
                  </p>
                ) : (
                  <div className="space-y-3 text-sm text-gray-700">
                    <p>
                      This reset link is invalid or has expired. Request a new one from the sign-in page.
                    </p>
                    <p className="text-xs text-gray-500">
                      If you keep seeing this with a fresh email: confirm Netlify build env{" "}
                      <code className="text-gray-700 bg-gray-100 px-1 rounded">VITE_SUPABASE_URL</code>{" "}
                      and <code className="text-gray-700 bg-gray-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code>{" "}
                      are for the same DatabasePad project as the link (e.g.{" "}
                      <code className="text-gray-700 bg-gray-100 px-1 rounded">…databasepad.com</code>
                      ), not a different supabase.co project.
                    </p>
                  </div>
                )}
                <a
                  href="/"
                  className="inline-block w-full text-center py-3 rounded-lg bg-[#1B3A5F] text-white font-medium hover:bg-[#152d4a]"
                >
                  Back to sign in
                </a>
              </div>
            )}
            {phase === "ready" && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                    autoComplete="new-password"
                    required
                  />
                </div>
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
                )}
                {message && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{message}</div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#F7941D] to-[#FDB54E] text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:from-[#E07D0D] hover:to-[#F7941D] disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Update password
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
        <p className="text-center text-blue-200 text-sm mt-6">
          <a href="/" className="underline hover:text-white">
            Back to sign in
          </a>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
