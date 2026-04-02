import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Segment, QuoteAnalysisResult, Policy } from '@/types';
import { bindQuote, getQuoteDetails, notifyBindSuccess } from '@/api';
import SegmentSelector from './SegmentSelector';
import QuoteResults from './QuoteResults';
import { Loader2, Sparkles, AlertTriangle, ArrowRight, Shield } from 'lucide-react';

interface QuoteScreenProps {
  quoteIdFromUrl?: string; // Optional: for loading a specific quote from URL
  onBindSuccess?: (policy: Policy) => void; // Callback when bind is successful
}

const QuoteScreen: React.FC<QuoteScreenProps> = ({ quoteIdFromUrl, onBindSuccess }) => {
  const { user } = useAuth();
  const [binding, setBinding] = useState(false);
  const [result, setResult] = useState<QuoteAnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [bindSuccess, setBindSuccess] = useState(false);
  const [newPolicy, setNewPolicy] = useState<Policy | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);

  // Load quote from URL if provided
  useEffect(() => {
    const loadQuoteFromUrl = async () => {
      if (quoteIdFromUrl) {
        setLoadingQuote(true);
        try {
          const quote = await getQuoteDetails(quoteIdFromUrl);
          if (quote) {
            // Convert database quote to QuoteAnalysisResult format
            setResult({
              quoteId: quote.quote_id,
              segment: quote.segment,
              premium: quote.premium || 0,
              coverageSummary: quote.coverage_summary || '',
              eligibility: quote.eligibility as 'Approved' | 'Review Required' | 'Declined',
              riskFactors: '',
              analyzedAt: quote.created_at
            });
          } else {
            setError('Quote not found');
          }
        } catch (err: any) {
          setError(err.message || 'Failed to load quote');
        }
        setLoadingQuote(false);
      }
    };

    loadQuoteFromUrl();
  }, [quoteIdFromUrl]);

  const handleSegmentQuoteRoute = (segment: Segment) => {
    const raw = segment.quoteUrl?.trim();
    if (!raw || !/^https:\/\//i.test(raw)) {
      setError('This segment is missing a valid quote link. Update segment quote URLs in the app config.');
      return;
    }
    setError('');
    window.location.assign(raw);
  };

  const handleBind = async (carrierId?: string | null, carrierName?: string) => {
    if (!result || !user) return;

    setBinding(true);
    setError('');

    try {
      // Use the updated bindQuote function with carrier info
      const policy = await bindQuote(result.quoteId, user.id, carrierId, carrierName);
      
      if (policy) {
        setNewPolicy(policy);
        setBindSuccess(true);

        // Fire-and-forget bind confirmation email
        void notifyBindSuccess({
          userEmail: user.email!,
          policyNumber: policy.policy_number,
          carrierName: policy.carrier || carrierName || 'CID Insurance Partners',
          premiumDisplay: `$${policy.premium.toLocaleString()}`,
          effectiveDate: policy.effective_date,
        }).catch((e) => console.warn('bind notify error:', e));
        
        // Call the success callback if provided
        if (onBindSuccess) {
          onBindSuccess(policy);
        }
      } else {
        throw new Error('Failed to create policy');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to bind quote. Please try again.');
    }

    setBinding(false);
  };


  const handleNewQuote = () => {
    setResult(null);
    setBindSuccess(false);
    setNewPolicy(null);
    setError('');
  };

  const handleGoToPolicyVault = () => {
    // This will be handled by the parent component through onBindSuccess
    // For now, we can trigger a page reload or navigation
    if (onBindSuccess && newPolicy) {
      onBindSuccess(newPolicy);
    } else {
      // Fallback: reload to show the policy vault
      window.location.reload();
    }
  };

  // Loading state for URL-based quote
  if (loadingQuote) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#1B3A5F] mx-auto mb-4" />
          <p className="text-gray-600">Loading quote details...</p>
        </div>
      </div>
    );
  }

  // Success state after binding
  if (bindSuccess && newPolicy) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Policy Created Successfully!</h2>
          
          {/* Policy Details */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4 text-left">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Policy Number:</span>
                <span className="font-mono font-bold text-[#1B3A5F]">{newPolicy.policy_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Carrier:</span>
                <span className="font-semibold text-gray-700">{newPolicy.carrier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Annual Premium:</span>
                <span className="font-bold text-[#F7941D]">
                  ${newPolicy.premium.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Effective Date:</span>
                <span className="text-gray-700">
                  {new Date(newPolicy.effective_date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Status:</span>
                <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
                  <Shield className="w-4 h-4" />
                  Active
                </span>
              </div>
            </div>
          </div>

          <p className="text-gray-500 mb-6">
            Your policy is now active. You can view all details in your Policy Vault.
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleGoToPolicyVault}
              className="w-full bg-gradient-to-r from-[#1B3A5F] to-[#2C5282] text-white py-3 rounded-xl font-semibold hover:from-[#152d4a] hover:to-[#1B3A5F] transition-all flex items-center justify-center gap-2"
            >
              <Shield className="w-5 h-5" />
              Go to Policy Vault
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={handleNewQuote}
              className="w-full bg-gradient-to-r from-[#F7941D] to-[#FDB54E] text-white py-3 rounded-xl font-semibold hover:from-[#E07D0D] hover:to-[#F7941D] transition-all"
            >
              Start New Quote
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Request a quote</h1>
      </div>

      {/* Quote Form */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Segment Selector */}
          <SegmentSelector onSelect={handleSegmentQuoteRoute} />

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="mt-6">
          <QuoteResults
            result={result}
            onBind={handleBind}
            binding={binding}
          />
        </div>
      )}
    </div>
  );
};

export default QuoteScreen;
