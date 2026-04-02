import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, bindToken?: string | null) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (!error && data?.role) {
        return data.role;
      }
    } catch (err) {
      console.error('Error fetching user role:', err);
    }
    return 'agent'; // Default role
  };

  useEffect(() => {
    let cancelled = false;
    const SAFETY_MS = 10_000;
    const safety = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, SAFETY_MS);

    const endInitialLoad = () => {
      window.clearTimeout(safety);
      if (!cancelled) setLoading(false);
    };

    const run = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session?.user) {
          const role = await fetchUserRole(session.user.id);
          if (cancelled) return;
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            full_name: session.user.user_metadata?.full_name,
            role,
          });
        }
      } catch (err) {
        console.error('getSession failed:', err);
      } finally {
        endInitialLoad();
      }
    };

    void run();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (cancelled) return;
        if (session?.user) {
          const role = await fetchUserRole(session.user.id);
          if (cancelled) return;
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            full_name: session.user.user_metadata?.full_name,
            role,
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('onAuthStateChange failed:', err);
      } finally {
        endInitialLoad();
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(safety);
      subscription.unsubscribe();
    };
  }, []);

  const SIGN_IN_TIMEOUT_MS = 30_000;

  const signIn = async (email: string, password: string) => {
    try {
      const result = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Sign in timed out. Check network, VPN, or that VITE_SUPABASE_URL matches your project.')),
            SIGN_IN_TIMEOUT_MS,
          ),
        ),
      ]);
      const { error } = result;
      return { error: error?.message || null };
    } catch (err) {
      console.error('signIn failed:', err);
      return { error: err instanceof Error ? err.message : 'Sign in failed' };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, bindToken?: string | null) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role: 'agent' },
        },
      });

      if (!error && data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          email,
          full_name: fullName,
          role: 'agent',
        });

        if (bindToken) {
          const { data: redeemData, error: redeemError } = await supabase.functions.invoke('redeem-bind-token', {
            body: {
              action: 'redeem',
              token: bindToken,
              email,
              user_id: data.user.id,
            },
          });
          if (redeemError || !redeemData?.ok) {
            return {
              error: redeemError?.message || (redeemData as { error?: string })?.error || 'Account created, but bind token redeem failed.',
            };
          }
        }
      }

      return { error: error?.message || null };
    } catch (err) {
      console.error('signUp failed:', err);
      return { error: err instanceof Error ? err.message : 'Sign up failed' };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      console.error('signOut failed:', err);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      return { error: error?.message || null };
    } catch (err) {
      console.error('resetPassword failed:', err);
      return { error: err instanceof Error ? err.message : 'Reset failed' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};
