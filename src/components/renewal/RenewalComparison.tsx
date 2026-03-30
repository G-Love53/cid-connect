import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Sparkles,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Shield,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Star,
  Building2,
  ChevronRight,
  Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Policy } from '@/types';
import { toast } from '@/components/ui/use-toast';

interface RenewalComparisonProps {
  onBack: () => void;
}

interface RenewalOption {
  id: string;
  carrier: string;
  premium: number;
  premiumChange: number;
  coverageSummary: string;
  highlights: string[];
  rating: number;
  isRecommended: boolean;
  isCurrent: boolean;
}

const RenewalComparison: React.FC<RenewalComparisonProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [binding, setBinding] = useState<string | null>(null);
  const [bound, setBound] = useState(false);
  const [selectedOption, setSelectedOption] = useState<RenewalOption | null>(null);
  
  const [renewalOptions, setRenewalOptions] = useState<RenewalOption[]>([]);

  useEffect(() => {
    if (user) {
      fetchPolicy();
    }
  }, [user]);

  useEffect(() => {
    if (policy) {
      analyzeRenewalOptions();
    }
  }, [policy]);

  const fetchPolicy = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('policies')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error) {
        setPolicy(data);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const analyzeRenewalOptions = async () => {
    if (!policy) return;
    
    setAnalyzing(true);
    
    // Simulate AI analysis - in production, this would call an actual API
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const currentPremium = policy.premium;
    
    // Generate mock renewal options
    const options: RenewalOption[] = [
      {
        id: '1',
        carrier: policy.carrier,
        premium: Math.round(currentPremium * 1.05),
        premiumChange: 5,
        coverageSummary: 'Same coverage as current policy with standard renewal increase',
        highlights: [
          'No coverage gaps',
          'Familiar claims process',
          'Loyalty discount applied'
        ],
        rating: 4.2,
        isRecommended: false,
        isCurrent: true
      },
      {
        id: '2',
        carrier: 'Acme Insurance Co.',
        premium: Math.round(currentPremium * 0.92),
        premiumChange: -8,
        coverageSummary: 'Competitive rates with equivalent coverage limits',
        highlights: [
          '8% savings vs current',
          'A+ rated carrier',
          'Enhanced cyber coverage included',
          '24/7 claims support'
        ],
        rating: 4.5,
        isRecommended: true,
        isCurrent: false
      },
      {
        id: '3',
        carrier: 'Guardian Shield Insurance',
        premium: Math.round(currentPremium * 0.95),
        premiumChange: -5,
        coverageSummary: 'Strong coverage with additional endorsements available',
        highlights: [
          '5% savings vs current',
          'Flexible payment options',
          'Free risk assessment'
        ],
        rating: 4.3,
        isRecommended: false,
        isCurrent: false
      },
      {
        id: '4',
        carrier: 'Premier Business Insurance',
        premium: Math.round(currentPremium * 1.02),
        premiumChange: 2,
        coverageSummary: 'Premium coverage with enhanced limits and lower deductibles',
        highlights: [
          'Higher coverage limits',
          'Lower deductibles',
          'Dedicated account manager',
          'Priority claims handling'
        ],
        rating: 4.7,
        isRecommended: false,
        isCurrent: false
      }
    ];
    
    setRenewalOptions(options);
    setAnalyzing(false);
  };

  const handleBind = async (option: RenewalOption) => {
    setBinding(option.id);
    
    try {
      // Simulate binding process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Save binding to database
      const { error } = await supabase
        .from('renewal_bindings')
        .insert({
          user_id: user?.id,
          policy_id: policy?.id,
          selected_carrier: option.carrier,
          selected_premium: option.premium,
          status: 'bound'
        });

      if (error) throw error;

      setSelectedOption(option);
      setBound(true);
      
      toast({
        title: 'Policy Bound!',
        description: `Your renewal with ${option.carrier} has been confirmed`
      });
    } catch (err: any) {
      console.error('Error binding policy:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to bind policy',
        variant: 'destructive'
      });
    } finally {
      setBinding(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <Card className="border-0 shadow-md">
          <CardContent className="p-6 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#F7941D]" />
            <span className="ml-2 text-gray-600">Loading...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (bound && selectedOption) {
    return (
      <div className="space-y-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Policy</span>
        </button>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Renewal Bound!</h2>
            <p className="text-gray-600 mb-6">
              Your policy has been successfully renewed.
            </p>
            
            <Card className="border-2 border-green-200 bg-green-50 mb-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#1B3A5F]" />
                    <span className="font-semibold text-[#1B3A5F]">{selectedOption.carrier}</span>
                  </div>
                  <Badge className="bg-green-500">Bound</Badge>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Annual Premium</p>
                  <p className="text-3xl font-bold text-[#1B3A5F]">
                    {formatCurrency(selectedOption.premium)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <p className="text-sm text-gray-500 mb-6">
              Your new policy documents will be emailed to you within 24 hours.
            </p>
            
            <Button onClick={onBack} className="bg-[#F7941D] hover:bg-[#E07D0D]">
              Return to Policy
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </button>

      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Sparkles className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Shop Your Renewal</h1>
          <p className="text-sm text-gray-500">AI-powered comparison of your options</p>
        </div>
      </div>

      {!policy ? (
        <Card className="border-0 shadow-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No active policy found.</p>
          </CardContent>
        </Card>
      ) : analyzing ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-purple-600 animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              AI is Analyzing Your Options
            </h3>
            <p className="text-gray-500 mb-4">
              Comparing carriers, coverage, and pricing...
            </p>
            <div className="flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#F7941D]" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Current Policy Summary */}
          <Card className="border-0 shadow-md bg-gradient-to-br from-[#1B3A5F] to-[#2C5282] text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Current Policy</p>
                  <p className="font-semibold">{policy.policy_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm opacity-80">Current Premium</p>
                  <p className="text-xl font-bold">{formatCurrency(policy.premium)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Recommendation Banner */}
          <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <p className="text-sm text-purple-800">
              <span className="font-semibold">AI Recommendation:</span> Based on your business profile and claims history, we found options that could save you up to 8%.
            </p>
          </div>

          {/* Renewal Options */}
          <div className="space-y-4">
            {renewalOptions.map((option) => (
              <Card 
                key={option.id}
                className={`border-2 shadow-md transition-all ${
                  option.isRecommended 
                    ? 'border-[#F7941D] bg-orange-50/50' 
                    : 'border-gray-100'
                }`}
              >
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-[#1B3A5F]" />
                      <div>
                        <p className="font-semibold text-[#1B3A5F]">{option.carrier}</p>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i}
                              className={`w-3 h-3 ${
                                i < Math.floor(option.rating) 
                                  ? 'text-yellow-400 fill-yellow-400' 
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                          <span className="text-xs text-gray-500 ml-1">{option.rating}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {option.isCurrent && (
                        <Badge variant="outline" className="text-xs">Current</Badge>
                      )}
                      {option.isRecommended && (
                        <Badge className="bg-[#F7941D] text-xs">Recommended</Badge>
                      )}
                    </div>
                  </div>

                  {/* Premium */}
                  <div className="flex items-center justify-between mb-3 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-500">Annual Premium</p>
                      <p className="text-2xl font-bold text-[#1B3A5F]">
                        {formatCurrency(option.premium)}
                      </p>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
                      option.premiumChange < 0 
                        ? 'bg-green-100 text-green-700' 
                        : option.premiumChange > 0
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                    }`}>
                      {option.premiumChange < 0 ? (
                        <TrendingDown className="w-4 h-4" />
                      ) : option.premiumChange > 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : null}
                      {option.premiumChange > 0 ? '+' : ''}{option.premiumChange}%
                    </div>
                  </div>

                  {/* Coverage Summary */}
                  <p className="text-sm text-gray-600 mb-3">{option.coverageSummary}</p>

                  {/* Highlights */}
                  <div className="space-y-1 mb-4">
                    {option.highlights.map((highlight, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-gray-600">{highlight}</span>
                      </div>
                    ))}
                  </div>

                  {/* Bind Button */}
                  <Button
                    onClick={() => handleBind(option)}
                    disabled={binding !== null}
                    className={`w-full ${
                      option.isRecommended
                        ? 'bg-[#F7941D] hover:bg-[#E07D0D]'
                        : 'bg-[#1B3A5F] hover:bg-[#2C5282]'
                    }`}
                  >
                    {binding === option.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Binding...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4 mr-2" />
                        Bind This Policy
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Help Text */}
          <p className="text-xs text-gray-400 text-center">
            All quotes are subject to underwriting approval. Coverage details may vary.
          </p>
        </>
      )}
    </div>
  );
};

export default RenewalComparison;
