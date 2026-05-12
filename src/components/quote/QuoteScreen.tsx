import React, { useState, useEffect } from 'react';
import { Segment, QuoteAnalysisResult } from '@/types';
import { getQuoteDetails } from '@/api';
import SegmentSelector from './SegmentSelector';
import QuoteResults from './QuoteResults';
import { Loader2, AlertTriangle, Shield } from 'lucide-react';

interface QuoteScreenProps {
  quoteIdFromUrl?: string;
}

const QuoteScreen: React.FC<QuoteScreenProps> = ({ quoteIdFromUrl }) => {
  const [result, setResult] = useState<QuoteAnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [loadingQuote, setLoadingQuote] = useState(false);

  useEffect(() => {
    const loadQuoteFromUrl = async () => {
      if (quoteIdFromUrl) {
        setLoadingQuote(true);
        try {
          const quote = await getQuoteDetails(quoteIdFromUrl);
          if (quote) {
            setResult({
              quoteId: quote.quote_id,
              segment: quote.segment,
              premium: quote.premium || 0,
              coverageSummary: quote.coverage_summary || '',
              eligibility: quote.eligibility as 'Approved' | 'Review Required' | 'Declined',
              riskFactors: '',
              analyzedAt: quote.created_at,
            });
          } else {
            setError('Quote not found');
          }
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : 'Failed to load quote');
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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Request a quote</h1>
        <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
          Start on your segment site to run intake and underwriting. Saved quotes here are for reference — binding happens after you complete the flow on the website.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-visible">
        <div className="p-6 space-y-6">
          <SegmentSelector onSelect={handleSegmentQuoteRoute} />

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="mt-6 space-y-3">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setError('');
              }}
              className="text-sm font-medium text-[#1B3A5F] hover:underline"
            >
              Clear results
            </button>
          </div>
          <QuoteResults result={result} />
        </div>
      )}
    </div>
  );
};

export default QuoteScreen;
