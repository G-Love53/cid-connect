import React, { useState, useEffect } from 'react';
import {
  Webhook, Loader2, RefreshCw, Filter, ChevronLeft, ChevronRight,
  Eye, ArrowUpRight, ArrowDownLeft, RotateCw, CheckCircle, XCircle, Clock
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import {
  getWebhookEvents, retryOutboundWebhook, formatRelativeTime,
  type WebhookEvent
} from '@/api';

const PAGE_SIZE = 50;

const WebhookLogTab: React.FC = () => {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [directionFilter, setDirectionFilter] = useState('all');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [offset, setOffset] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Collect unique event types for filter dropdown
  const [eventTypes, setEventTypes] = useState<string[]>([]);

  useEffect(() => { setOffset(0); }, [directionFilter, eventTypeFilter]);
  useEffect(() => { fetchEvents(); }, [directionFilter, eventTypeFilter, offset]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const result = await getWebhookEvents({
        direction: directionFilter,
        event_type: eventTypeFilter,
        limit: PAGE_SIZE,
        offset
      });
      setEvents(result.rows);
      setTotal(result.total);

      // Build event type list from first load
      if (offset === 0) {
        const types = new Set(result.rows.map(e => e.event_type));
        setEventTypes(prev => {
          const merged = new Set([...prev, ...types]);
          return Array.from(merged).sort();
        });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: 'Failed to load webhook events', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleRetry = async (event: WebhookEvent) => {
    setRetryingId(event.id);
    const result = await retryOutboundWebhook(event);
    setRetryingId(null);

    if (result.success) {
      toast({ title: 'Retry Sent', description: 'The outbound request has been re-sent.' });
      fetchEvents();
    } else {
      toast({ title: 'Retry Failed', description: result.error || 'Unknown error', variant: 'destructive' });
    }
  };

  const getDirectionBadge = (direction: string) => {
    if (direction === 'inbound') {
      return (
        <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1 text-xs">
          <ArrowDownLeft className="w-3 h-3" /> Inbound
        </Badge>
      );
    }
    return (
      <Badge className="bg-orange-100 text-orange-700 flex items-center gap-1 text-xs">
        <ArrowUpRight className="w-3 h-3" /> Outbound
      </Badge>
    );
  };

  const getStatusBadge = (status: number | null) => {
    if (status == null) return <Badge className="bg-gray-100 text-gray-600 text-xs">N/A</Badge>;
    if (status >= 200 && status < 300) {
      return <Badge className="bg-green-100 text-green-700 flex items-center gap-1 text-xs"><CheckCircle className="w-3 h-3" />{status}</Badge>;
    }
    if (status >= 400) {
      return <Badge className="bg-red-100 text-red-700 flex items-center gap-1 text-xs"><XCircle className="w-3 h-3" />{status}</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-700 flex items-center gap-1 text-xs"><Clock className="w-3 h-3" />{status}</Badge>;
  };

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Webhook className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-800">Webhook Log</h3>
          {total > 0 && <Badge className="bg-indigo-100 text-indigo-700 text-xs">{total}</Badge>}
        </div>
        <Button onClick={fetchEvents} variant="outline" size="sm" className="flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 text-sm text-gray-500"><Filter className="w-4 h-4" /> Filters:</div>
            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Direction" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Directions</SelectItem>
                <SelectItem value="inbound">Inbound</SelectItem>
                <SelectItem value="outbound">Outbound</SelectItem>
              </SelectContent>
            </Select>
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Event Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Event Types</SelectItem>
                {eventTypes.map(t => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Events list */}
      {loading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            <span className="ml-2 text-gray-600">Loading webhook events...</span>
          </CardContent>
        </Card>
      ) : events.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <Webhook className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No webhook events found</p>
            <p className="text-xs text-gray-400 mt-1">Events are logged by edge functions (send-notification, check-renewals, receive-external-webhook).</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {events.map((evt) => (
            <Card key={evt.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    {getDirectionBadge(evt.direction)}
                    <Badge variant="outline" className="text-xs text-gray-600">{evt.event_type.replace(/_/g, ' ')}</Badge>
                    {evt.source && <span className="text-xs text-gray-400 font-mono">{evt.source}</span>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getStatusBadge(evt.response_status)}
                    <span className="text-xs text-gray-400 whitespace-nowrap">{formatRelativeTime(evt.created_at)}</span>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpandedId(expandedId === evt.id ? null : evt.id)}>
                      <Eye className="w-3.5 h-3.5 text-gray-400" />
                    </Button>
                    {/* Retry button for failed outbound */}
                    {evt.direction === 'outbound' && evt.response_status != null && evt.response_status >= 400 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        disabled={retryingId === evt.id}
                        onClick={() => handleRetry(evt)}
                      >
                        {retryingId === evt.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
                        <span className="ml-1">Retry</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Endpoint */}
                {evt.endpoint && (
                  <p className="text-xs text-gray-400 mt-1 font-mono truncate">{evt.endpoint}</p>
                )}

                {/* Expanded details */}
                {expandedId === evt.id && (
                  <div className="mt-3 space-y-2">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Request Body</p>
                      <pre className="p-2 bg-gray-50 rounded text-xs text-gray-600 overflow-x-auto max-h-[200px] overflow-y-auto border border-gray-100">
                        {evt.request_body ? JSON.stringify(evt.request_body, null, 2) : '(empty)'}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Response Body</p>
                      <pre className="p-2 bg-gray-50 rounded text-xs text-gray-600 overflow-x-auto max-h-[200px] overflow-y-auto border border-gray-100">
                        {evt.response_body ? JSON.stringify(evt.response_body, null, 2) : '(empty)'}
                      </pre>
                    </div>
                    <p className="text-[10px] text-gray-400">
                      ID: {evt.id} | Created: {new Date(evt.created_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} className="flex items-center gap-1">
              <ChevronLeft className="w-3 h-3" /> Prev
            </Button>
            <span className="text-xs text-gray-500">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)} className="flex items-center gap-1">
              Next <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebhookLogTab;
