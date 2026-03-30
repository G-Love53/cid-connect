import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, DollarSign, Shield, FileText, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Quote } from '@/types';
import { getQuoteDetails } from '@/api';

interface QuoteComparisonProps {
  quoteIds: string[];
  onBack: () => void;
}

const QuoteComparison: React.FC<QuoteComparisonProps> = ({ quoteIds, onBack }) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuotes();
  }, [quoteIds]);

  const fetchQuotes = async () => {
    setLoading(true);
    const results = await Promise.all(quoteIds.map(id => getQuoteDetails(id)));
    setQuotes(results.filter(Boolean) as Quote[]);
    setLoading(false);
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '\u2014';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
  };

  const getEligibilityColor = (eligibility: string) => {
    switch (eligibility) {
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Review Required': return 'bg-yellow-100 text-yellow-800';
      case 'Declined': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Extract coverage fields from ai_summary or quote fields
  const getCoverageField = (q: Quote, field: string): string => {
    // Try ai_summary first
    if (q.ai_summary && typeof q.ai_summary === 'object') {
      const summary = q.ai_summary;
      if (summary[field]) return String(summary[field]);
      // Try nested coverage object
      if (summary.coverage && summary.coverage[field]) return String(summary.coverage[field]);
      if (summary.coverageLimits && summary.coverageLimits[field]) return String(summary.coverageLimits[field]);
    }
    return '\u2014';
  };

  // Comparison row labels and value extractors
  const comparisonRows: { label: string; getValue: (q: Quote) => string }[] = [
    { label: 'Quote ID', getValue: q => q.quote_id },
    { label: 'Segment', getValue: q => q.segment || '\u2014' },
    { label: 'Carrier', getValue: q => q.carrier || '\u2014' },
    { label: 'Premium', getValue: q => formatCurrency(q.premium) },
    { label: 'Eligibility', getValue: q => q.eligibility || '\u2014' },
    { label: 'Status', getValue: q => q.status || '\u2014' },
    { label: 'GL Limit', getValue: q => getCoverageField(q, 'general_liability') || getCoverageField(q, 'gl_limit') },
    { label: 'Property Limit', getValue: q => getCoverageField(q, 'property') || getCoverageField(q, 'property_limit') },
    { label: 'Auto Limit', getValue: q => getCoverageField(q, 'auto') || getCoverageField(q, 'auto_limit') },
    { label: 'Umbrella', getValue: q => getCoverageField(q, 'umbrella') || getCoverageField(q, 'umbrella_limit') },
    { label: 'Deductible', getValue: q => getCoverageField(q, 'deductible') },
    { label: 'Created', getValue: q => new Date(q.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
  ];

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4">
          <ArrowLeft className="w-5 h-5" /> <span className="font-medium">Back</span>
        </button>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-[#F7941D] animate-spin" />
        </div>
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="max-w-5xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4">
          <ArrowLeft className="w-5 h-5" /> <span className="font-medium">Back</span>
        </button>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No quotes found for comparison</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Find lowest premium for highlighting
  const premiums = quotes.map(q => q.premium || Infinity);
  const lowestPremiumIdx = premiums.indexOf(Math.min(...premiums));

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors">
        <ArrowLeft className="w-5 h-5" /> <span className="font-medium">Back to Quote History</span>
      </button>

      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">Quote Comparison</h1>
        <p className="text-gray-500">Comparing {quotes.length} quotes side by side</p>
      </div>

      {/* Desktop: table layout */}
      <div className="hidden md:block">
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide p-4 w-40">Field</th>
                  {quotes.map((q, idx) => (
                    <th key={q.id} className={`text-left p-4 ${idx === lowestPremiumIdx ? 'bg-green-50/50' : ''}`}>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-[#F7941D]/10 rounded-lg">
                          <FileText className="w-4 h-4 text-[#F7941D]" />
                        </div>
                        <div>
                          <p className="font-mono font-bold text-[#1B3A5F] text-sm">{q.quote_id}</p>
                          <Badge className={`${getEligibilityColor(q.eligibility)} text-[10px] mt-0.5`}>{q.eligibility}</Badge>
                        </div>
                      </div>
                      {idx === lowestPremiumIdx && q.premium && (
                        <Badge className="bg-green-100 text-green-700 text-[10px] mt-1">Lowest Premium</Badge>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, rowIdx) => (
                  <tr key={row.label} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="p-4 text-sm font-medium text-gray-500">{row.label}</td>
                    {quotes.map((q, idx) => {
                      const val = row.getValue(q);
                      const isPremiumRow = row.label === 'Premium';
                      const isLowest = isPremiumRow && idx === lowestPremiumIdx;
                      return (
                        <td key={q.id} className={`p-4 text-sm ${isLowest ? 'font-bold text-green-700 bg-green-50/30' : 'text-gray-800'} ${idx === lowestPremiumIdx && !isPremiumRow ? 'bg-green-50/10' : ''}`}>
                          {row.label === 'Eligibility' ? (
                            <Badge className={`${getEligibilityColor(val)} text-xs`}>{val}</Badge>
                          ) : row.label === 'Status' ? (
                            <Badge className="bg-gray-100 text-gray-700 text-xs capitalize">{val}</Badge>
                          ) : (
                            val
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Mobile: stacked cards */}
      <div className="md:hidden space-y-4">
        {quotes.map((q, idx) => (
          <Card key={q.id} className={`border-0 shadow-sm ${idx === lowestPremiumIdx ? 'ring-2 ring-green-300' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#F7941D]" />
                  <p className="font-mono font-bold text-[#1B3A5F]">{q.quote_id}</p>
                </div>
                <Badge className={getEligibilityColor(q.eligibility)}>{q.eligibility}</Badge>
              </div>
              {idx === lowestPremiumIdx && q.premium && (
                <Badge className="bg-green-100 text-green-700 text-xs mb-3">Lowest Premium</Badge>
              )}
              <div className="space-y-2">
                {comparisonRows.map(row => (
                  <div key={row.label} className="flex justify-between text-sm">
                    <span className="text-gray-500">{row.label}</span>
                    <span className="font-medium text-gray-800 text-right">{row.getValue(q)}</span>
                  </div>
                ))}
              </div>
              {q.coverage_summary && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Coverage Summary</p>
                  <p className="text-sm text-gray-600">{q.coverage_summary}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Summary comparison */}
      {quotes.some(q => q.coverage_summary) && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Coverage Summaries</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quotes.map(q => (
              <Card key={q.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="font-mono text-sm font-bold text-[#1B3A5F] mb-2">{q.quote_id}</p>
                  <p className="text-sm text-gray-600">{q.coverage_summary || 'No coverage summary available'}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuoteComparison;
