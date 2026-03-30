import React, { useState, useEffect } from 'react';
import { QuoteAnalysisResult, Quote, CarrierOption } from '@/types';
import { getQuoteDetails, downloadQuotePdf, emailQuotePdf } from '@/api';
import { supabase } from '@/lib/supabase';
import { CheckCircle, AlertCircle, XCircle, DollarSign, FileText, Shield, Hash, Loader2, Building2, Star, Download, Mail } from 'lucide-react';

interface QuoteResultsProps {
  result?: QuoteAnalysisResult;
  quoteId?: string;
  onBind: (carrierId?: string | null, carrierName?: string) => void;
  binding: boolean;
}

const QuoteResults: React.FC<QuoteResultsProps> = ({ result: propResult, quoteId, onBind, binding }) => {
  const [liveQuote, setLiveQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [selectedCarrierId, setSelectedCarrierId] = useState<string | null>(null);
  const [selectedCarrierName, setSelectedCarrierName] = useState<string | undefined>(undefined);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [emailingPdf, setEmailingPdf] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleDownloadPdf = async () => {
    const qid = propResult?.quoteId || liveQuote?.quote_id || quoteId;
    if (!qid) return;
    setDownloadingPdf(true);
    try {
      const success = await downloadQuotePdf(qid);
      if (!success) console.error('PDF download failed');
    } catch (err) {
      console.error('PDF download error:', err);
    }
    setDownloadingPdf(false);
  };

  const handleEmailPdf = async () => {
    const qid = propResult?.quoteId || liveQuote?.quote_id || quoteId;
    if (!qid) return;
    setEmailingPdf(true);
    setEmailSent(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email;
      if (!email) { setEmailingPdf(false); return; }
      const result = await emailQuotePdf(qid, email);
      if (result.success) setEmailSent(true);
      else console.error('Email failed:', result.error);
    } catch (err) {
      console.error('Email PDF error:', err);
    }
    setEmailingPdf(false);
  };

  useEffect(() => {
    const fetchQuote = async () => {
      if (quoteId && !propResult) {
        setLoading(true);
        setFetchError('');
        try {
          const quote = await getQuoteDetails(quoteId);
          if (quote) setLiveQuote(quote);
          else setFetchError('Quote not found');
        } catch (err: any) {
          setFetchError(err.message || 'Failed to fetch quote details');
        }
        setLoading(false);
      }
    };
    fetchQuote();
  }, [quoteId, propResult]);

  useEffect(() => {
    if (propResult?.carrierOptions && propResult.carrierOptions.length > 0 && !selectedCarrierId) {
      setSelectedCarrierId(propResult.carrierId || propResult.carrierOptions[0].id);
      setSelectedCarrierName(propResult.carrier || propResult.carrierOptions[0].name);
    }
  }, [propResult]);

  const displayData = propResult ? {
    quoteId: propResult.quoteId, segment: propResult.segment, premium: propResult.premium,
    coverageSummary: propResult.coverageSummary, eligibility: propResult.eligibility,
    riskFactors: propResult.riskFactors, carrier: propResult.carrier || 'CID Insurance Partners',
    carrierId: propResult.carrierId || null, carrierOptions: propResult.carrierOptions || [], businessName: ''
  } : liveQuote ? {
    quoteId: liveQuote.quote_id, segment: liveQuote.segment, premium: liveQuote.premium || 0,
    coverageSummary: liveQuote.coverage_summary || '',
    eligibility: liveQuote.eligibility as 'Approved' | 'Review Required' | 'Declined',
    riskFactors: '', carrier: liveQuote.carrier || 'CID Insurance Partners', carrierId: null,
    carrierOptions: [] as CarrierOption[], businessName: liveQuote.business_name || ''
  } : null;

  const getEligibilityStyles = (eligibility: string) => {
    switch (eligibility) {
      case 'Approved': return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: <CheckCircle className="w-5 h-5 text-green-500" /> };
      case 'Review Required': return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: <AlertCircle className="w-5 h-5 text-yellow-500" /> };
      case 'Declined': return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: <XCircle className="w-5 h-5 text-red-500" /> };
      default: return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', icon: <AlertCircle className="w-5 h-5 text-gray-500" /> };
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  const renderStars = (rating: number | null) => {
    if (!rating) return null;
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.3;
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className={`w-3.5 h-3.5 ${i < fullStars ? 'text-yellow-400 fill-yellow-400' : i === fullStars && hasHalf ? 'text-yellow-400 fill-yellow-400/50' : 'text-gray-200'}`} />
        ))}
        <span className="text-xs text-gray-500 ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  if (loading) return (
    <div className="animate-fade-in">
      <div className="bg-gradient-to-r from-[#1B3A5F] to-[#2C5282] rounded-t-xl p-4"><h3 className="text-lg font-bold text-white flex items-center gap-2"><Shield className="w-5 h-5" />Loading Quote Details...</h3></div>
      <div className="bg-white rounded-b-xl border-2 border-t-0 border-gray-100 shadow-lg p-8"><div className="flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#1B3A5F]" /><span className="ml-3 text-gray-600">Fetching quote information...</span></div></div>
    </div>
  );

  if (fetchError) return (
    <div className="animate-fade-in">
      <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-t-xl p-4"><h3 className="text-lg font-bold text-white flex items-center gap-2"><XCircle className="w-5 h-5" />Error Loading Quote</h3></div>
      <div className="bg-white rounded-b-xl border-2 border-t-0 border-gray-100 shadow-lg p-8"><p className="text-red-600 text-center">{fetchError}</p></div>
    </div>
  );

  if (!displayData) return null;

  const eligibilityStyles = getEligibilityStyles(displayData.eligibility);
  const carrierOptions = displayData.carrierOptions;
  const activeCarrier = carrierOptions.find(c => c.id === selectedCarrierId) || null;

  return (
    <div className="animate-fade-in">
      <div className="bg-gradient-to-r from-[#1B3A5F] to-[#2C5282] rounded-t-xl p-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2"><Shield className="w-5 h-5" />Quote Analysis Results</h3>
      </div>
      <div className="bg-white rounded-b-xl border-2 border-t-0 border-gray-100 shadow-lg">
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2"><Hash className="w-5 h-5 text-gray-400" /><span className="text-sm text-gray-500">Quote ID:</span><span className="font-mono font-bold text-[#1B3A5F]">{displayData.quoteId}</span></div>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${eligibilityStyles.bg} ${eligibilityStyles.border} border`}>{eligibilityStyles.icon}<span className={`font-semibold ${eligibilityStyles.text}`}>{displayData.eligibility}</span></div>
          </div>
        </div>

        {carrierOptions.length > 0 ? (
          <div className="p-4 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2"><Building2 className="w-4 h-4" />Available Carriers ({carrierOptions.length})</p>
            <div className="space-y-2">
              {carrierOptions.map((carrier) => {
                const isSelected = selectedCarrierId === carrier.id;
                return (
                  <button key={carrier.id} onClick={() => { setSelectedCarrierId(carrier.id); setSelectedCarrierName(carrier.name); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${isSelected ? 'border-[#F7941D] bg-orange-50/50 shadow-sm' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                      {carrier.logo_url ? <img src={carrier.logo_url} alt={carrier.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : <div className="w-full h-full flex items-center justify-center bg-[#1B3A5F]/10"><Building2 className="w-5 h-5 text-[#1B3A5F]" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2"><p className="font-semibold text-gray-800 text-sm truncate">{carrier.name}</p>{isSelected && <CheckCircle className="w-4 h-4 text-[#F7941D] flex-shrink-0" />}</div>
                      {carrier.rating && renderStars(carrier.rating)}
                      {carrier.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{carrier.description}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-4 border-b border-gray-100 bg-blue-50/50">
            <div className="flex items-center gap-3"><div className="w-12 h-12 bg-[#1B3A5F]/10 rounded-xl flex items-center justify-center"><Building2 className="w-6 h-6 text-[#1B3A5F]" /></div><div><p className="text-sm text-gray-500">Insurance Carrier</p><p className="text-xl font-bold text-gray-800">{displayData.carrier}</p></div></div>
          </div>
        )}

        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3"><div className="w-12 h-12 bg-[#F7941D]/10 rounded-xl flex items-center justify-center"><DollarSign className="w-6 h-6 text-[#F7941D]" /></div><div><p className="text-sm text-gray-500">Estimated Annual Premium</p><p className="text-3xl font-bold text-gray-800">{formatCurrency(displayData.premium)}</p><p className="text-xs text-gray-400 mt-1">~{formatCurrency(Math.round(displayData.premium / 12))}/month</p></div></div>
        </div>

        {displayData.coverageSummary && (
          <div className="p-4 border-b border-gray-100"><div className="flex items-start gap-3"><div className="w-12 h-12 bg-[#1B3A5F]/10 rounded-xl flex items-center justify-center flex-shrink-0"><FileText className="w-6 h-6 text-[#1B3A5F]" /></div><div><p className="text-sm text-gray-500 mb-2">Coverage Summary</p><p className="text-gray-700 leading-relaxed">{displayData.coverageSummary}</p></div></div></div>
        )}

        {displayData.riskFactors && (
          <div className="p-4 border-b border-gray-100 bg-gray-50"><p className="text-sm text-gray-500 mb-1">Risk Assessment Notes</p><p className="text-gray-600 text-sm italic">{displayData.riskFactors}</p></div>
        )}

        <div className="p-4">
          <button onClick={() => onBind(selectedCarrierId, selectedCarrierName)} disabled={binding || displayData.eligibility === 'Declined'}
            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${displayData.eligibility === 'Declined' ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-[#F7941D] to-[#FDB54E] text-white hover:from-[#E07D0D] hover:to-[#F7941D] shadow-lg hover:shadow-xl active:scale-[0.98]'}`}>
            {binding ? (<><Loader2 className="w-5 h-5 animate-spin" />Creating Policy...</>) : displayData.eligibility === 'Declined' ? 'Unable to Bind - Declined' : (<><CheckCircle className="w-5 h-5" />{activeCarrier ? `BIND WITH ${activeCarrier.name.toUpperCase()}` : 'BIND NOW'}</>)}
          </button>
          {displayData.eligibility === 'Review Required' && <p className="text-center text-sm text-yellow-600 mt-2">This quote requires underwriter review before binding</p>}

          <button onClick={handleDownloadPdf} disabled={downloadingPdf}
            className="w-full mt-3 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all border-2 border-[#1B3A5F] text-[#1B3A5F] hover:bg-[#1B3A5F] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed">
            {downloadingPdf ? (<><Loader2 className="w-4 h-4 animate-spin" />Generating PDF...</>) : (<><Download className="w-4 h-4" />Download Quote PDF</>)}
          </button>

          <button onClick={handleEmailPdf} disabled={emailingPdf || emailSent}
            className={`w-full mt-2 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all border-2 disabled:opacity-50 disabled:cursor-not-allowed ${emailSent ? 'border-green-500 text-green-600 bg-green-50' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}>
            {emailingPdf ? (<><Loader2 className="w-4 h-4 animate-spin" />Sending Email...</>) : emailSent ? (<><CheckCircle className="w-4 h-4" />Email Sent</>) : (<><Mail className="w-4 h-4" />Email Quote PDF</>)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuoteResults;
