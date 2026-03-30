import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  FileText, 
  AlertTriangle, 
  MessageCircle,
  Calendar,
  Building2,
  DollarSign,
  Clock,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  Download,
  Sparkles,
  CreditCard,
  Bell,
  History
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Policy } from '@/types';

interface PolicyVaultProps {
  onRequestCOI: () => void;
  onFileClaim: () => void;
  onCoverageChat: () => void;
  onDownloadDocuments: () => void;
  onShopRenewal: () => void;
  onUpdatePayment: () => void;
  onRenewalReminders: () => void;
  onCarrierDetail?: (carrierId: string) => void;
  onViewTimeline?: (policyId: string) => void;
}

const PolicyVault: React.FC<PolicyVaultProps> = ({ 
  onRequestCOI, 
  onFileClaim, 
  onCoverageChat,
  onDownloadDocuments,
  onShopRenewal,
  onUpdatePayment,
  onRenewalReminders,
  onCarrierDetail,
  onViewTimeline
}) => {


  const { user } = useAuth();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (user) {
      fetchPolicy();
    }
  }, [user, refreshKey]);

  const fetchPolicy = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('policies')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching policy:', error);
      }
      
      setPolicy(data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Function to manually refresh policy data
  const refreshPolicy = () => {
    setRefreshKey(prev => prev + 1);
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getDaysUntilExpiration = (expirationDate: string) => {
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const serviceActions = [
    {
      id: 'coi',
      title: 'Request COI',
      description: 'Get a Certificate of Insurance',
      icon: FileText,
      color: 'bg-[#1B3A5F]',
      onClick: onRequestCOI
    },
    {
      id: 'claim',
      title: 'File a Claim',
      description: 'Report an incident or loss',
      icon: AlertTriangle,
      color: 'bg-[#F7941D]',
      onClick: onFileClaim
    },
    {
      id: 'chat',
      title: 'Coverage Chat',
      description: 'AI-powered support',
      icon: MessageCircle,
      color: 'bg-green-500',
      onClick: onCoverageChat
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-[#F7941D]" />
      </div>
    );
  }

  const daysUntilRenewal = policy ? getDaysUntilExpiration(policy.expiration_date) : 0;
  const showRenewalBanner = policy && daysUntilRenewal <= 60;

  return (
    <div className="space-y-6">
      {/* Renewal Banner - Prominent Shop Renewal Button */}
      {showRenewalBanner && (
        <Card className="border-0 shadow-lg bg-gradient-to-r from-orange-500 to-red-500 text-white overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Clock className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">Renewal Coming Up!</h3>
                <p className="text-sm opacity-90">
                  {daysUntilRenewal} days until your policy expires
                </p>
              </div>
              <Button
                onClick={onShopRenewal}
                className="bg-white text-orange-600 hover:bg-gray-100 font-semibold"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Shop Renewal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Policy Status Card */}
      {policy ? (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-[#1B3A5F] to-[#2C5282] text-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-blue-200">Active Policy</p>
                  <p className="font-bold text-lg">{policy.policy_number}</p>
                </div>
              </div>
              <Badge className="bg-[#F7941D] text-white border-0 hover:bg-[#E07D0D]">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Active
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-blue-100">
                <Building2 className="w-4 h-4" />
                <span className="font-medium">{policy.business_name}</span>
              </div>
              
              <div className="flex items-center gap-2 text-blue-100">
                <span className="text-sm capitalize">{policy.segment}</span>
              </div>

              <div className="pt-3 border-t border-white/20 flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-200">Carrier</p>
                  {policy.carrier_id && onCarrierDetail ? (
                    <button
                      type="button"
                      className="text-left font-medium text-orange-300 underline underline-offset-2 hover:text-orange-200 transition-colors"
                      onClick={() => onCarrierDetail(policy.carrier_id!)}
                    >
                      {policy.carrier}
                    </button>
                  ) : (
                    <p className="font-medium">{policy.carrier}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-200">Annual Premium</p>
                  <p className="font-bold text-xl">{formatCurrency(policy.premium)}</p>
                </div>

              </div>
            </div>

            {/* Download Documents Button */}
            <Button
              onClick={onDownloadDocuments}
              variant="outline"
              className="w-full mt-4 border-white/30 text-white hover:bg-white/10 bg-transparent"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Policy Documents
            </Button>

            {onViewTimeline && policy && (
              <Button
                onClick={() => onViewTimeline(policy.id)}
                variant="outline"
                className="w-full mt-2 border-white/30 text-white hover:bg-white/10 bg-transparent"
              >
                <History className="w-4 h-4 mr-2" />
                View Timeline
              </Button>
            )}

          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-100 to-gray-200">
          <CardContent className="p-6 text-center">
            <Shield className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <h3 className="font-semibold text-gray-700 mb-1">No Active Policy</h3>
            <p className="text-sm text-gray-500">
              Contact your agent to get coverage
            </p>
          </CardContent>
        </Card>
      )}

      {/* Service Actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">Quick Actions</h2>
        <div className="grid gap-3">
          {serviceActions.map((action) => (
            <button
              key={action.id}
              onClick={action.onClick}
              className="w-full bg-white rounded-xl shadow-md p-4 flex items-center gap-4 hover:shadow-lg transition-all active:scale-[0.98]"
            >
              <div className={`p-3 rounded-xl ${action.color}`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-800">{action.title}</h3>
                <p className="text-sm text-gray-500">{action.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          ))}
        </div>
      </div>

      {/* Policy Details */}
      {policy && (
        <>
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#F7941D]" />
                Policy Period
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Effective Date</span>
                <span className="font-medium">{formatDate(policy.effective_date)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Expiration Date</span>
                <span className="font-medium">{formatDate(policy.expiration_date)}</span>
              </div>
              {daysUntilRenewal <= 60 && (
                <button
                  onClick={onRenewalReminders}
                  className="w-full flex items-center gap-2 p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                >
                  <Bell className="w-4 h-4 text-[#F7941D]" />
                  <span className="text-sm text-orange-700 flex-1 text-left">
                    {daysUntilRenewal} days until renewal
                  </span>
                  <ChevronRight className="w-4 h-4 text-orange-400" />
                </button>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#F7941D]" />
                Coverage Limits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {policy.general_liability_limit && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">General Liability</span>
                  <span className="font-medium">{policy.general_liability_limit}</span>
                </div>
              )}
              {policy.property_limit && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Property</span>
                  <span className="font-medium">{policy.property_limit}</span>
                </div>
              )}
              {policy.auto_limit && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Commercial Auto</span>
                  <span className="font-medium">{policy.auto_limit}</span>
                </div>
              )}
              {policy.workers_comp_limit && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Workers Comp</span>
                  <span className="font-medium">{policy.workers_comp_limit}</span>
                </div>
              )}
              {policy.umbrella_limit && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Umbrella</span>
                  <span className="font-medium">{policy.umbrella_limit}</span>
                </div>
              )}
              {policy.deductible && (
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm text-gray-500">Deductible</span>
                  <span className="font-medium">{formatCurrency(policy.deductible)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Info */}
          {policy.next_payment_date && (
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#F7941D]" />
                  Next Payment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <p className="text-sm text-gray-500">Due Date</p>
                    <p className="font-medium">{formatDate(policy.next_payment_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Amount</p>
                    <p className="font-bold text-lg text-[#1B3A5F]">
                      {policy.next_payment_amount ? formatCurrency(policy.next_payment_amount) : 'N/A'}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={onUpdatePayment}
                  variant="outline"
                  className="w-full border-[#1B3A5F]/30 text-[#1B3A5F] hover:bg-[#1B3A5F]/10"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Update Payment Method
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default PolicyVault;
