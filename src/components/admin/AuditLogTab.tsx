import React, { useState, useEffect } from 'react';
import {
  Clock, Loader2, RefreshCw, Filter, FileText, AlertTriangle, Shield, User,
  Search, Download, ChevronLeft, ChevronRight, Calendar, Webhook, ChevronDown, ChevronUp, Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  getRecentAuditLogsPaginated, downloadAuditLogCsv, getInboundWebhookEvents,
  AuditLogEntry, AuditLogPaginatedResult, InboundWebhookEvent, formatRelativeTime
} from '@/api';
import { toast } from '@/components/ui/use-toast';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger
} from '@/components/ui/collapsible';

const ACTION_OPTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'claim_status_change', label: 'Claim Status Change' },
  { value: 'claim_settlement', label: 'Claim Settlement' },
  { value: 'claim_bulk_update', label: 'Claim Bulk Update' },
  { value: 'coi_status_change', label: 'COI Status Change' },
  { value: 'coi_bulk_update', label: 'COI Bulk Update' },
  { value: 'coi_pdf_url', label: 'COI PDF URL' },
  { value: 'user_role_change', label: 'User Role Change' },
];

const ENTITY_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'claim', label: 'Claims' },
  { value: 'coi_request', label: 'COI Requests' },
  { value: 'user', label: 'Users' },
];

const actionBadgeConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  'claim_status_change': { color: 'bg-blue-100 text-blue-800', icon: <AlertTriangle className="w-3 h-3" /> },
  'claim_settlement': { color: 'bg-green-100 text-green-800', icon: <Shield className="w-3 h-3" /> },
  'claim_bulk_update': { color: 'bg-purple-100 text-purple-800', icon: <AlertTriangle className="w-3 h-3" /> },
  'coi_status_change': { color: 'bg-yellow-100 text-yellow-800', icon: <FileText className="w-3 h-3" /> },
  'coi_bulk_update': { color: 'bg-orange-100 text-orange-800', icon: <FileText className="w-3 h-3" /> },
  'coi_pdf_url': { color: 'bg-cyan-100 text-cyan-800', icon: <FileText className="w-3 h-3" /> },
  'user_role_change': { color: 'bg-red-100 text-red-800', icon: <User className="w-3 h-3" /> },
};

const PAGE_SIZE = 50;

const AuditLogTab: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [actionFilter, setActionFilter] = useState('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [offset, setOffset] = useState(0);

  // Webhook sub-section state
  const [webhookEvents, setWebhookEvents] = useState<InboundWebhookEvent[]>([]);
  const [webhookTotal, setWebhookTotal] = useState(0);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookOpen, setWebhookOpen] = useState(false);
  const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null);

  useEffect(() => { setOffset(0); }, [actionFilter, entityTypeFilter, startDate, endDate]);
  useEffect(() => { fetchLogs(); }, [actionFilter, entityTypeFilter, startDate, endDate, offset]);

  const getFilters = () => ({
    action: actionFilter, entity_type: entityTypeFilter,
    startDate: startDate || undefined, endDate: endDate || undefined,
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const result = await getRecentAuditLogsPaginated({ ...getFilters(), offset, limit: PAGE_SIZE });
      setLogs(result.rows); setTotal(result.total);
    } catch (err: any) {
      toast({ title: 'Error', description: 'Failed to load audit logs', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const fetchWebhooks = async () => {
    setWebhookLoading(true);
    try {
      const result = await getInboundWebhookEvents({ limit: 50, offset: 0 });
      setWebhookEvents(result.rows); setWebhookTotal(result.total);
    } catch (err: any) {
      console.error('Error fetching webhooks:', err);
    } finally { setWebhookLoading(false); }
  };

  // Load webhooks when section is opened
  useEffect(() => {
    if (webhookOpen && webhookEvents.length === 0 && !webhookLoading) { fetchWebhooks(); }
  }, [webhookOpen]);

  const handleDownloadCsv = async () => {
    setDownloadingCsv(true);
    try {
      await downloadAuditLogCsv(getFilters());
      toast({ title: 'Download Started', description: 'Audit log CSV is downloading.' });
    } catch (err: any) {
      toast({ title: 'Download Failed', description: err.message || 'Could not generate CSV.', variant: 'destructive' });
    } finally { setDownloadingCsv(false); }
  };

  const getActionBadge = (action: string) => {
    const config = actionBadgeConfig[action] || { color: 'bg-gray-100 text-gray-800', icon: null };
    return <Badge className={`${config.color} flex items-center gap-1 text-xs`}>{config.icon}{action.replace(/_/g, ' ')}</Badge>;
  };

  const getEntityBadge = (entityType: string) => {
    const colors: Record<string, string> = { 'claim': 'bg-orange-100 text-orange-800', 'coi_request': 'bg-blue-100 text-blue-800', 'policy': 'bg-green-100 text-green-800', 'user': 'bg-red-100 text-red-800' };
    return <Badge className={`${colors[entityType] || 'bg-gray-100 text-gray-800'} text-xs`}>{entityType.replace(/_/g, ' ')}</Badge>;
  };

  const formatDetails = (details: Record<string, any>): string => {
    if (!details || Object.keys(details).length === 0) return '';
    const parts: string[] = [];
    if (details.new_status) parts.push(`Status: ${details.new_status}`);
    if (details.old_role && details.new_role) parts.push(`${details.old_role} → ${details.new_role}`);
    if (details.count) parts.push(`Count: ${details.count}`);
    if (details.settlement_amount != null) parts.push(`Amount: $${Number(details.settlement_amount).toLocaleString()}`);
    if (details.settlement_date) parts.push(`Date: ${details.settlement_date}`);
    if (details.claim_number) parts.push(`Claim: ${details.claim_number}`);
    if (details.request_number) parts.push(`COI: ${details.request_number}`);
    if (details.user_email) parts.push(`User: ${details.user_email}`);
    if (details.pdf_url) parts.push('PDF URL set');
    if (details.failed_count) parts.push(`Failed: ${details.failed_count}`);
    if (details.success_count != null) parts.push(`Success: ${details.success_count}`);
    return parts.length === 0 ? Object.entries(details).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ') : parts.join(' | ');
  };

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 text-sm text-gray-500"><Filter className="w-4 h-4" /> Filters:</div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Action" /></SelectTrigger>
              <SelectContent>{ACTION_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Entity Type" /></SelectTrigger>
              <SelectContent>{ENTITY_TYPE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-gray-400" />
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-[140px] text-xs" />
              <span className="text-gray-400 text-xs">to</span>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-[140px] text-xs" />
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Button onClick={handleDownloadCsv} disabled={downloadingCsv} variant="outline" size="sm" className="flex items-center gap-1">
                {downloadingCsv ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} CSV
              </Button>
              <Button onClick={fetchLogs} variant="outline" size="sm" className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Refresh</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log entries */}
      {loading ? (
        <Card className="border-0 shadow-sm"><CardContent className="p-8 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#F7941D]" /><span className="ml-2 text-gray-600">Loading audit logs...</span></CardContent></Card>
      ) : logs.length === 0 ? (
        <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center"><Search className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No audit log entries found</p><p className="text-xs text-gray-400 mt-1">Entries will appear here as admin actions are performed</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {logs.map((entry) => (
            <Card key={entry.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">{getActionBadge(entry.action)}{getEntityBadge(entry.entity_type)}
                      {entry.entity_id && <span className="text-xs text-gray-400 font-mono truncate max-w-[200px]">{entry.entity_id}</span>}
                    </div>
                    {entry.details && Object.keys(entry.details).length > 0 && <p className="text-sm text-gray-600 mt-1">{formatDetails(entry.details)}</p>}
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-400"><User className="w-3 h-3" /><span>{entry.admin_email || entry.admin_user_id.substring(0, 8) + '...'}</span></div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap"><Clock className="w-3 h-3" /><span title={new Date(entry.created_at).toLocaleString()}>{formatRelativeTime(entry.created_at)}</span></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total} entries</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} className="flex items-center gap-1"><ChevronLeft className="w-3 h-3" /> Prev</Button>
            <span className="text-xs text-gray-500">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)} className="flex items-center gap-1">Next <ChevronRight className="w-3 h-3" /></Button>
          </div>
        </div>
      )}

      {/* Webhooks Sub-Section */}
      <Collapsible open={webhookOpen} onOpenChange={setWebhookOpen}>
        <Card className="border-0 shadow-sm">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50/50 transition-colors py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Webhook className="w-4 h-4 text-indigo-600" />
                  Inbound Webhooks
                  {webhookTotal > 0 && <Badge className="bg-indigo-100 text-indigo-700 text-xs ml-1">{webhookTotal}</Badge>}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {webhookOpen && (
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); fetchWebhooks(); }} className="h-7 px-2">
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                  )}
                  {webhookOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 px-4 pb-4">
              {webhookLoading ? (
                <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-indigo-500" /><span className="ml-2 text-sm text-gray-500">Loading webhooks...</span></div>
              ) : webhookEvents.length === 0 ? (
                <div className="text-center py-6">
                  <Webhook className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No inbound webhook events yet</p>
                  <p className="text-xs text-gray-400 mt-1">Events will appear here when external systems POST to the <code className="bg-gray-100 px-1 rounded">receive-external-webhook</code> endpoint.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {webhookEvents.map((evt) => (
                    <div key={evt.id} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge className="bg-indigo-100 text-indigo-700 text-xs flex-shrink-0">{evt.source}</Badge>
                          <Badge variant="outline" className="text-xs text-gray-500 flex-shrink-0">{evt.event_type}</Badge>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-400">{formatRelativeTime(evt.created_at)}</span>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setExpandedWebhook(expandedWebhook === evt.id ? null : evt.id)}>
                            <Eye className="w-3 h-3 text-gray-400" />
                          </Button>
                        </div>
                      </div>
                      {/* Truncated payload preview */}
                      <p className="text-xs text-gray-500 mt-1 font-mono truncate">
                        {JSON.stringify(evt.payload).substring(0, 120)}{JSON.stringify(evt.payload).length > 120 ? '...' : ''}
                      </p>
                      {/* Expanded full JSON */}
                      {expandedWebhook === evt.id && (
                        <pre className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 overflow-x-auto max-h-[200px] overflow-y-auto border border-gray-100">
                          {JSON.stringify(evt.payload, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-3">
                Webhook endpoint: <code className="bg-gray-100 px-1 rounded">POST /functions/v1/receive-external-webhook</code> — Requires <code className="bg-gray-100 px-1 rounded">X-Webhook-Secret</code> header matching <code className="bg-gray-100 px-1 rounded">GATEWAY_API_KEY</code>.
              </p>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};

export default AuditLogTab;
