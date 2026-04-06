import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Lock, ArrowRight, Eye, EyeOff } from "lucide-react";

type Phase = "checking" | "ready" | "invalid";

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
  const established = useRef(false);

  useEffect(() => {
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

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) markReady();
    });

    const failTimer = window.setTimeout(() => {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (!established.current) {
          if (session) markReady();
          else setPhase("invalid");
        }
      });
    }, 12000);

    return () => {
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
              <p className="text-sm text-gray-600">Verifying your reset link…</p>
            )}
            {phase === "invalid" && (
              <div className="space-y-4">
                <p className="text-sm text-gray-700">
                  This reset link is invalid or has expired. Request a new one from the sign-in page.
                </p>
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
