import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, AlertCircle, Building2, ExternalLink, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Policy } from '@/types';
import { toast } from '@/components/ui/use-toast';
import { getActivePolicyForUser, requestRenewalIntakeUrl } from '@/api';
import { isConnectInsuranceApiEnabled } from '@/lib/connectApi';
import { quoteIntakeUrlForSegment } from '@/constants/segmentQuoteRoutes';

interface RenewalComparisonProps {
  onBack: () => void;
}

const RenewalComparison: React.FC<RenewalComparisonProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingRenewal, setOpeningRenewal] = useState(false);

  useEffect(() => {
    if (user) {
      void fetchPolicy();
    }
  }, [user]);

  const fetchPolicy = async () => {
    if (!user) return;
    try {
      const active = await getActivePolicyForUser(user.id);
      setPolicy(active);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRenewalIntake = async () => {
    if (!policy?.id) {
      toast({
        title: 'Missing policy',
        description: 'No policy id available for renewal.',
        variant: 'destructive',
      });
      return;
    }
    if (!isConnectInsuranceApiEnabled()) {
      toast({
        title: 'Renewal link unavailable',
        description: 'The insurance API URL is not configured for this app.',
        variant: 'destructive',
      });
      return;
    }
    setOpeningRenewal(true);
    try {
      const { redirectUrl } = await requestRenewalIntakeUrl(policy.id);
      window.location.assign(redirectUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not open renewal application.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setOpeningRenewal(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const segmentSiteUrl = policy ? quoteIntakeUrlForSegment(policy.segment) : '';

  if (loading) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <Card className="border-0 shadow-md">
          <CardContent className="p-6 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#F7941D]" />
            <span className="ml-2 text-gray-600">Loading…</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </button>

      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-[#1B3A5F]/10 rounded-lg">
          <Shield className="w-6 h-6 text-[#1B3A5F]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Renew your policy</h1>
          <p className="text-sm text-gray-500">
            Continue on your segment site — same underwriting and e-sign flow as new business.
          </p>
        </div>
      </div>

      {!policy ? (
        <Card className="border-0 shadow-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No active policy found.</p>
            <p className="text-sm text-gray-500 mt-2">
              Renewals need a policy tied to your account (often after bind completes in the pipeline).
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-0 shadow-md bg-gradient-to-br from-[#1B3A5F] to-[#2C5282] text-white">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm opacity-80">Policy</p>
                  <p className="font-semibold font-mono">{policy.policy_number}</p>
                  <div className="flex items-center gap-2 text-sm opacity-90 pt-1">
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span>{policy.carrier}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm opacity-80">Premium</p>
                  <p className="text-xl font-bold">{formatCurrency(policy.premium)}</p>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleOpenRenewalIntake}
                disabled={openingRenewal || !isConnectInsuranceApiEnabled()}
                className="w-full bg-white text-[#1B3A5F] hover:bg-gray-100 font-semibold"
              >
                {openingRenewal ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                    Opening…
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2 inline" />
                    Open prefilled renewal application
                  </>
                )}
              </Button>
              {!isConnectInsuranceApiEnabled() && (
                <p className="text-xs opacity-90">Set VITE_CID_API_URL in this app to enable the secure renewal link.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border border-gray-100 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm text-gray-600">
                Prefer to start fresh without prefilled data? You can open the public quote page for your segment.
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => window.location.assign(segmentSiteUrl)}
              >
                <ExternalLink className="w-4 h-4 mr-2 inline" />
                Open segment quote page
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default RenewalComparison;
