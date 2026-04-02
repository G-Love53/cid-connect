import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface LoginScreenProps {
  onSuccess: () => void;
  prefillEmail?: string;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess, prefillEmail }) => {
  const { signIn, signUp, resetPassword } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [bindToken] = useState(() => new URLSearchParams(window.location.search).get('bind_token'));
  const [prefilledEmail] = useState(() => prefillEmail || new URLSearchParams(window.location.search).get('email'));

  React.useEffect(() => {
    if (prefilledEmail && !email) setEmail(prefilledEmail);
  }, [prefilledEmail, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (showForgotPassword) {
        const { error } = await resetPassword(email);
        if (error) {
          setError(error);
        } else {
          setMessage('Password reset email sent! Check your inbox.');
        }
      } else if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error);
        } else {
          onSuccess();
        }
      } else {
        if (!fullName.trim()) {
          setError('Please enter your full name');
          return;
        }
        if (bindToken) {
          const { data, error: validateError } = await supabase.functions.invoke('redeem-bind-token', {
            body: { action: 'validate', token: bindToken, email },
          });
          if (validateError || !data?.ok) {
            setError(validateError?.message || data?.error || 'Invalid or expired bind link.');
            return;
          }
        }

        const { error } = await signUp(email, password, fullName, bindToken);
        if (error) {
          setError(error);
        } else {
          setMessage(bindToken
            ? 'Account created and policy access linked. Please verify your email.'
            : 'Account created! Please check your email to verify your account.');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: `url(https://d64gsuwffb70l.cloudfront.net/6924df57ab7f6b1bb2f30643_1765657682017_a1227f18.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1B3A5F]/90 via-[#1B3A5F]/80 to-[#2C5282]/90" />
      
      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header with Logo */}
          <div className="bg-gradient-to-r from-[#1B3A5F] to-[#2C5282] p-6 text-center">
            <div className="flex items-center justify-center mb-3">
              <img 
                src="https://d64gsuwffb70l.cloudfront.net/6924df0368d7442ec1a565a5_1765667401275_db0552a0.png" 
                alt="CID Connect"

                className="h-16 w-auto object-contain bg-white rounded-lg p-2"
              />
            </div>
            <p className="text-blue-200 text-sm mt-2">Service Portal</p>
          </div>

          {/* Form */}
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
              {showForgotPassword ? 'Reset Password' : isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>

            {bindToken && !showForgotPassword && !isLogin && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                You are using a policy bind link. Create your account with the same email used for binding.
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {message && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && !showForgotPassword && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent transition-all"
                      placeholder="John Smith"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                {prefilledEmail && (
                  <p className="text-xs text-blue-600 mb-1">Pre-filled from your invite link</p>
                )}
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent transition-all"
                    placeholder="you@company.com"
                    required
                  />
                </div>
              </div>

              {!showForgotPassword && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent transition-all"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              )}

              {isLogin && !showForgotPassword && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-[#F7941D] hover:text-[#E07D0D] transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#F7941D] to-[#FDB54E] text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:from-[#E07D0D] hover:to-[#F7941D] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {showForgotPassword ? 'Send Reset Link' : isLogin ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              {showForgotPassword ? (
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="text-[#F7941D] hover:text-[#E07D0D] font-medium transition-colors"
                >
                  Back to Sign In
                </button>
              ) : (
                <p className="text-gray-600">
                  {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
                  <button
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setError('');
                      setMessage('');
                    }}
                    className="text-[#F7941D] hover:text-[#E07D0D] font-medium transition-colors"
                  >
                    {isLogin ? 'Sign Up' : 'Sign In'}
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-blue-200 text-sm mt-6">
          &copy; 2026 CID Connect. All rights reserved.
        </p>

      </div>
    </div>
  );
};

export default LoginScreen;
