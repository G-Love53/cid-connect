import React, { useState, useEffect } from 'react';
import {
  Mail, Loader2, CheckCircle, XCircle, Search, CheckSquare, Square,
  FileText, RefreshCw, Send, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Quote } from '@/types';
import { getAllQuotesAdmin, emailQuotePdf, getUserEmailById, logAdminAction } from '@/api';
import { useAuth } from '@/contexts/AuthContext';

const AdminBulkQuoteEmail: React.FC = () => {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Bulk send state
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendTotal, setSendTotal] = useState(0);
  const [sendResults, setSendResults] = useState<{ quoteId: string; success: boolean; error?: string }[]>([]);

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    setLoading(true);
    const data = await getAllQuotesAdmin();
    setQuotes(data);
    setLoading(false);
  };

  const filteredQuotes = quotes.filter(q => {
    const matchesSearch =
      q.quote_id.toLowerCase().includes(search.toLowerCase()) ||
      (q.business_name || '').toLowerCase().includes(search.toLowerCase()) ||
      q.segment.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredQuotes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredQuotes.map(q => q.id)));
    }
  };

  const handleBulkSend = async () => {
    const selected = filteredQuotes.filter(q => selectedIds.has(q.id));
    if (selected.length === 0) return;

    const confirmed = window.confirm(
      `Send PDF email summaries for ${selected.length} quote(s)?\n\nEach quote's owner will receive an email with their quote PDF attached.`
    );
    if (!confirmed) return;

    setSending(true);
    setSendProgress(0);
    setSendTotal(selected.length);
    setSendResults([]);

    const results: { quoteId: string; success: boolean; error?: string }[] = [];

    for (let i = 0; i < selected.length; i++) {
      const quote = selected[i];
      setSendProgress(i + 1);

      try {
        // Resolve user email from profile
        const email = await getUserEmailById(quote.user_id);
        if (!email) {
          results.push({ quoteId: quote.quote_id, success: false, error: 'No email found for user' });
          continue;
        }

        const result = await emailQuotePdf(quote.quote_id, email);
        results.push({ quoteId: quote.quote_id, success: result.success, error: result.error });

        // Small delay to avoid rate limits
        if (i < selected.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (err: any) {
        results.push({ quoteId: quote.quote_id, success: false, error: err.message });
      }
    }

    setSendResults(results);
    setSending(false);
    setSelectedIds(new Set());

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    // Audit log
    if (user) {
      logAdminAction({
        admin_user_id: user.id,
        admin_email: user.email,
        action: 'bulk_quote_email',
        entity_type: 'quote',
        details: { total: selected.length, success: successCount, failed: failCount }
      }).catch(() => {});
    }

    toast({
      title: failCount === 0 ? 'All Emails Sent' : 'Bulk Send Complete',
      description: `${successCount} sent, ${failCount} failed`,
      variant: failCount > 0 ? 'destructive' : 'default'
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#F7941D]" />
          <span className="ml-2 text-gray-600">Loading quotes...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#F7941D]" />
            Bulk Quote PDF Email
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Select quotes and send PDF summaries to the insured user's email address.
          </p>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search quotes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="quoted">Quoted</SelectItem>
                <SelectItem value="bound">Bound</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchQuotes} variant="outline" size="sm" className="flex items-center gap-1">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Select All */}
          {filteredQuotes.length > 0 && (
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
              >
                {selectedIds.size === filteredQuotes.length && filteredQuotes.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-[#F7941D]" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                Select all ({filteredQuotes.length})
              </button>
              {selectedIds.size > 0 && (
                <span className="text-xs text-gray-400">{selectedIds.size} selected</span>
              )}
            </div>
          )}

          {/* Quote List */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredQuotes.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No quotes found</p>
              </div>
            ) : (
              filteredQuotes.map(q => (
                <div
                  key={q.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedIds.has(q.id) ? 'border-[#F7941D]/40 bg-orange-50/50' : 'border-gray-100 hover:bg-gray-50'
                  }`}
                  onClick={() => toggleSelection(q.id)}
                >
                  <button type="button" className="flex-shrink-0" onClick={(e) => { e.stopPropagation(); toggleSelection(q.id); }}>
                    {selectedIds.has(q.id) ? (
                      <CheckSquare className="w-4 h-4 text-[#F7941D]" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-[#1B3A5F]">{q.quote_id}</span>
                      <Badge className={q.status === 'bound' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                        {q.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {q.business_name || q.segment} &middot; {formatCurrency(q.premium)}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(q.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Send Progress */}
      {sending && (
        <Card className="border-0 shadow-sm border-l-4 border-l-[#F7941D]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#F7941D]" />
              <span className="text-sm font-medium">Sending emails... {sendProgress} of {sendTotal}</span>
            </div>
            <Progress value={(sendProgress / sendTotal) * 100} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      {sendResults.length > 0 && !sending && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Send Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {sendResults.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm py-1">
                  {r.success ? (
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  )}
                  <span className="font-mono text-xs">{r.quoteId}</span>
                  {r.error && <span className="text-xs text-red-500 truncate">{r.error}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Floating Send Bar */}
      {selectedIds.size > 0 && !sending && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1B3A5F] text-white rounded-xl shadow-2xl px-5 py-3 flex items-center gap-4">
          <span className="text-sm font-medium">{selectedIds.size} quote(s) selected</span>
          <Button
            size="sm"
            onClick={handleBulkSend}
            className="bg-[#F7941D] hover:bg-[#E07D0D] text-white text-xs"
          >
            <Send className="w-3 h-3 mr-1" />
            Send PDF summaries
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
            className="text-white hover:bg-white/20 text-xs"
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminBulkQuoteEmail;
