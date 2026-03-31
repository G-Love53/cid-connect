import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import LoginScreen from './auth/LoginScreen';
import MainApp from './MainApp';
import BindTokenRedemption from './auth/BindTokenRedemption';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [bindContext, setBindContext] = useState<{ token: string; email: string } | null>(null);

  useEffect(() => {
    if (user) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('bind_token');
    const email = params.get('email');
    if (token && email) {
      setBindContext({ token, email });
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a365d] to-[#2d4a7c] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (bindContext) {
    return (
      <BindTokenRedemption
        token={bindContext.token}
        email={bindContext.email}
        onComplete={() => {
          window.history.replaceState({}, '', window.location.pathname);
          setBindContext(null);
          setIsAuthenticated(true);
        }}
      />
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onSuccess={() => setIsAuthenticated(true)} />;
  }

  return <MainApp />;
};

const AppLayout: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default AppLayout;
