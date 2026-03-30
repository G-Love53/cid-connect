import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Quote } from '@/types';
import { ArrowLeft, Clock, DollarSign, CheckCircle, AlertCircle, XCircle, Search, Filter, ChevronRight, FileText, Loader2, RefreshCw, ExternalLink, GitCompare, Square, CheckSquare, X } from 'lucide-react';

interface QuoteHistoryProps {
  onBack: () => void;
  onOpenQuote: (quote: Quote) => void;
  onCompareQuotes?: (quoteIds: string[]) => void;
}

const QuoteHistory: React.FC<QuoteHistoryProps> = ({ onBack, onOpenQuote, onCompareQuotes }) => {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  // Compare mode
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchQuotes();
    }
  }, [user]);

  const fetchQuotes = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setQuotes(data);
    }
    setLoading(false);
  };

  const getStatusIcon = (status: string, eligibility: string) => {
    if (status === 'bound') return <CheckCircle className="w-5 h-5 text-green-500" />;
    switch (eligibility) {
      case 'Approved': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'Review Required': return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'Declined': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string, eligibility: string) => {
    if (status === 'bound') return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Bound</span>;
    switch (eligibility) {
      case 'Approved': return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Approved</span>;
      case 'Review Required': return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">Review</span>;
      case 'Declined': return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">Declined</span>;
      default: return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">Pending</span>;
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = quote.quote_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.segment.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'bound' && quote.status === 'bound') ||
                         (filterStatus === 'quoted' && quote.status === 'quoted');
    return matchesSearch && matchesFilter;
  });

  const isBindable = (q: Quote) => q.status === 'quoted' && q.eligibility !== 'Declined';

  const toggleCompareSelection = (quoteId: string) => {
    setSelectedForCompare(prev => {
      const next = new Set(prev);
      if (next.has(quoteId)) {
        next.delete(quoteId);
      } else {
        if (next.size >= 3) {
          // Max 3 selections
          return prev;
        }
        next.add(quoteId);
      }
      return next;
    });
  };

  const handleStartCompare = () => {
    if (selectedForCompare.size < 2) return;
    if (onCompareQuotes) {
      onCompareQuotes(Array.from(selectedForCompare));
    }
  };

  const exitCompareMode = () => {
    setCompareMode(false);
    setSelectedForCompare(new Set());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#F7941D] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button */}
      <button type="button" onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors">
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back</span>
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">Quote History</h1>
          <p className="text-gray-500">View and manage your past quote submissions</p>
        </div>
        <div className="flex items-center gap-2">
          {!compareMode && quotes.length >= 2 && (
            <button
              onClick={() => setCompareMode(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              <GitCompare className="w-4 h-4" />
              Compare Quotes
            </button>
          )}
          {compareMode && (
            <button
              onClick={exitCompareMode}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          )}
          <button onClick={fetchQuotes} className="p-2 text-gray-400 hover:text-[#F7941D] hover:bg-orange-50 rounded-lg transition-colors" title="Refresh">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Compare mode banner */}
      {compareMode && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-sm font-semibold text-indigo-800">Compare Mode</p>
                <p className="text-xs text-indigo-600">Select 2-3 quotes to compare side by side ({selectedForCompare.size}/3 selected)</p>
              </div>
            </div>
            <button
              onClick={handleStartCompare}
              disabled={selectedForCompare.size < 2}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                selectedForCompare.size >= 2
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                  : 'bg-indigo-200 text-indigo-400 cursor-not-allowed'
              }`}
            >
              Compare {selectedForCompare.size} Quotes
            </button>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Quote ID or Segment..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent bg-white"
            >
              <option value="all">All Quotes</option>
              <option value="quoted">Quoted</option>
              <option value="bound">Bound</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quote List */}
      {filteredQuotes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No quotes found</h3>
          <p className="text-gray-400">
            {quotes.length === 0 ? "You haven't submitted any quotes yet" : "No quotes match your search criteria"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQuotes.map((quote) => {
            const isSelected = selectedForCompare.has(quote.id);
            const isMaxed = selectedForCompare.size >= 3 && !isSelected;

            return (
              <div
                key={quote.id}
                onClick={() => {
                  if (compareMode) {
                    if (!isMaxed) toggleCompareSelection(quote.id);
                  } else {
                    setSelectedQuote(selectedQuote?.id === quote.id ? null : quote);
                  }
                }}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all cursor-pointer ${
                  compareMode && isSelected ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-gray-100'
                } ${compareMode && isMaxed ? 'opacity-50' : ''}`}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {compareMode ? (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); if (!isMaxed) toggleCompareSelection(quote.id); }}
                          className="flex-shrink-0"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-indigo-600" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                      ) : (
                        getStatusIcon(quote.status, quote.eligibility)
                      )}
                      <div>
                        <p className="font-mono font-bold text-[#1B3A5F]">{quote.quote_id}</p>
                        <p className="text-sm text-gray-500">{quote.segment}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="font-bold text-gray-800">{formatCurrency(quote.premium)}</p>
                        <p className="text-xs text-gray-400">{formatDate(quote.created_at)}</p>
                      </div>
                      {getStatusBadge(quote.status, quote.eligibility)}
                      {!compareMode && (
                        <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${selectedQuote?.id === quote.id ? 'rotate-90' : ''}`} />
                      )}
                    </div>
                  </div>

                  {/* Expanded Details (only in non-compare mode) */}
                  {!compareMode && selectedQuote?.id === quote.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100 animate-fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Premium</p>
                          <p className="font-bold text-lg text-gray-800">{formatCurrency(quote.premium)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Created</p>
                          <p className="text-gray-700">{formatDate(quote.created_at)}</p>
                        </div>
                        {quote.bound_at && (
                          <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Bound</p>
                            <p className="text-gray-700">{formatDate(quote.bound_at)}</p>
                          </div>
                        )}
                      </div>
                      {quote.coverage_summary && (
                        <div className="mt-4">
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Coverage Summary</p>
                          <p className="text-gray-600 text-sm">{quote.coverage_summary}</p>
                        </div>
                      )}
                      <div className="mt-4">
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Application Details</p>
                        <p className="text-gray-600 text-sm line-clamp-3">{quote.application_details}</p>
                      </div>

                      {isBindable(quote) && (
                        <div className="mt-4 pt-3 border-t border-gray-100">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onOpenQuote(quote); }}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#F7941D] to-[#FDB54E] text-white rounded-xl font-semibold text-sm hover:from-[#E07D0D] hover:to-[#F7941D] transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Open Quote
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default QuoteHistory;
