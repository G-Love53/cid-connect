import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginScreen from './LoginScreen';
import { getUserPolicies, redeemBindToken } from '@/api';
import PostBindOnboarding from '@/components/onboarding/PostBindOnboarding';
import { Policy } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

interface Props {
  token: string;
  email: string;
  onComplete: () => void;
}

const BindTokenRedemption: React.FC<Props> = ({ token, email, onComplete }) => {
  const { user, loading } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const attemptRedeem = async () => {
    if (!user) return;
    setProcessing(true);
    setError(null);
    const res = await redeemBindToken(token, email, user.id);
    if (!res.ok && res.error !== 'token_already_used') {
      setError(res.error || 'redeem_failed');
      setProcessing(false);
      return;
    }
    const userPolicies = await getUserPolicies(user.id);
    setPolicies(userPolicies);

    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed, full_name')
      .eq('id', user.id)
      .maybeSingle();

    setShowOnboarding(!profile?.onboarding_completed);
    setProcessing(false);
  };

  useEffect(() => {
    if (user) void attemptRedeem();
  }, [user]);

  if (loading || processing) {
    return <div className="min-h-screen flex items-center justify-center">Processing bind link...</div>;
  }

  if (!user) {
    return <LoginScreen onSuccess={() => {}} prefillEmail={email} />;
  }

  if (error) {
    return (
      <div className="min-h-screen p-4">
        <Card className="max-w-xl mx-auto mt-16">
          <CardHeader><CardTitle>Bind Link Error</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-red-600">{error}</p>
            <Button onClick={() => void attemptRedeem()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-2xl mx-auto mt-8">
          <PostBindOnboarding userId={user.id} policies={policies} currentFullName={user.full_name} onDone={onComplete} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <Card className="max-w-xl mx-auto mt-16">
        <CardHeader><CardTitle>Bind Complete</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">Your account is linked. Continue to Policy Vault.</p>
          <Button onClick={onComplete}>Get Started</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BindTokenRedemption;
