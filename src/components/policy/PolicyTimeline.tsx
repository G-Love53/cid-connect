import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Shield,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Calendar,
  RefreshCw,
  Loader2,
  Building2,
  Sparkles,
  CreditCard,
  FileCheck
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  getPolicyById,
  getUserQuotes,
  getClaimsForPolicy,
  getCoiRequestsForPolicy,
} from '@/api';
import { Policy } from '@/types';

interface PolicyTimelineProps {
  policyId: string;
  onBack: () => void;
}

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'policy' | 'quote' | 'claim' | 'coi' | 'payment' | 'renewal';
  status?: string;
  icon: React.ReactNode;
  color: string;
}

const PolicyTimeline: React.FC<PolicyTimelineProps> = ({ policyId, onBack }) => {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTimelineData();
  }, [policyId]);

  const fetchTimelineData = async () => {
    setLoading(true);
    setError('');

    try {
      const policyData = await getPolicyById(policyId);

      if (!policyData) {
        setError('Policy not found');
        setLoading(false);
        return;
      }

      setPolicy(policyData);

      const timelineEvents: TimelineEvent[] = [];

      // 1. Policy created event
      timelineEvents.push({
        id: `policy-created-${policyData.id}`,
        date: policyData.created_at,
        title: 'Policy Created',
        description: `Policy ${policyData.policy_number} was bound with ${policyData.carrier || 'carrier'}. Annual premium: $${Number(policyData.premium || 0).toLocaleString()}.`,
        type: 'policy',
        status: 'active',
        icon: <Shield className="w-4 h-4" />,
        color: 'bg-green-500',
      });

      // 2. Policy effective date event
      if (policyData.effective_date) {
        timelineEvents.push({
          id: `policy-effective-${policyData.id}`,
          date: new Date(policyData.effective_date).toISOString(),
          title: 'Coverage Effective',
          description: `Coverage began for ${policyData.business_name}.`,
          type: 'policy',
          status: 'active',
          icon: <CheckCircle2 className="w-4 h-4" />,
          color: 'bg-[#1B3A5F]',
        });
      }

      // 3. Policy expiration / renewal date
      if (policyData.expiration_date) {
        const expDate = new Date(policyData.expiration_date);
        const now = new Date();
        const isPast = expDate < now;
        timelineEvents.push({
          id: `policy-expiration-${policyData.id}`,
          date: expDate.toISOString(),
          title: isPast ? 'Policy Expired' : 'Policy Expiration',
          description: isPast
            ? `Policy expired on ${formatDate(policyData.expiration_date)}.`
            : `Policy is scheduled to expire on ${formatDate(policyData.expiration_date)}.`,
          type: 'renewal',
          status: isPast ? 'expired' : 'upcoming',
          icon: <Calendar className="w-4 h-4" />,
          color: isPast ? 'bg-red-500' : 'bg-orange-400',
        });
      }

      // 4. Next payment event
      if (policyData.next_payment_date) {
        timelineEvents.push({
          id: `payment-next-${policyData.id}`,
          date: new Date(policyData.next_payment_date).toISOString(),
          title: 'Next Payment Due',
          description: `$${Number(policyData.next_payment_amount || 0).toLocaleString()} due (${policyData.payment_frequency || 'monthly'}).`,
          type: 'payment',
          status: 'upcoming',
          icon: <CreditCard className="w-4 h-4" />,
          color: 'bg-purple-500',
        });
      }

      const quotes = (await getUserQuotes(policyData.user_id)).slice(0, 10);

      if (quotes.length) {
        for (const q of quotes) {
          timelineEvents.push({
            id: `quote-${q.id}`,
            date: q.created_at,
            title: `Quote ${q.quote_id || 'Submitted'}`,
            description: `${q.segment} quote for ${q.business_name || 'business'}. ${q.eligibility || ''} — $${Number(q.premium || 0).toLocaleString()}/yr.`,
            type: 'quote',
            status: q.status,
            icon: <FileText className="w-4 h-4" />,
            color: q.status === 'bound' ? 'bg-green-500' : 'bg-blue-500',
          });

          if (q.bound_at) {
            timelineEvents.push({
              id: `quote-bound-${q.id}`,
              date: q.bound_at,
              title: 'Quote Bound',
              description: `Quote ${q.quote_id} was bound into a policy.`,
              type: 'quote',
              status: 'bound',
              icon: <Sparkles className="w-4 h-4" />,
              color: 'bg-[#F7941D]',
            });
          }
        }
      }

      const claims = await getClaimsForPolicy(policyId, policyData.user_id);

      if (claims.length) {
        for (const c of claims) {
          timelineEvents.push({
            id: `claim-${c.id}`,
            date: c.created_at,
            title: `Claim Filed — ${c.claim_number || 'Pending'}`,
            description: `${(c.claim_type || 'claim').replace(/_/g, ' ')} — ${c.description?.substring(0, 80) || 'No description'}`,
            type: 'claim',
            status: c.status,
            icon: <AlertTriangle className="w-4 h-4" />,
            color: c.status === 'approved' ? 'bg-green-500' : c.status === 'denied' ? 'bg-red-500' : 'bg-yellow-500',
          });

          if (c.settlement_date) {
            timelineEvents.push({
              id: `claim-settled-${c.id}`,
              date: new Date(c.settlement_date).toISOString(),
              title: 'Claim Settled',
              description: `${c.claim_number} settled for $${Number(c.settlement_amount || 0).toLocaleString()}.`,
              type: 'claim',
              status: 'settled',
              icon: <DollarSign className="w-4 h-4" />,
              color: 'bg-green-600',
            });
          }
        }
      }

      const coiRequests = await getCoiRequestsForPolicy(policyId, policyData.user_id);

      if (coiRequests.length) {
        for (const coi of coiRequests) {
          timelineEvents.push({
            id: `coi-${coi.id}`,
            date: coi.created_at,
            title: `COI Requested — ${coi.request_number}`,
            description: `Certificate for ${coi.certificate_holder_name || 'holder'}. Status: ${coi.status}.`,
            type: 'coi',
            status: coi.status,
            icon: <FileCheck className="w-4 h-4" />,
            color: coi.status === 'completed' ? 'bg-green-500' : 'bg-blue-400',
          });
        }
      }

      // Sort events by date descending (most recent first)
      timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setEvents(timelineEvents);
    } catch (err: any) {
      console.error('Timeline fetch error:', err);
      setError(err.message || 'Failed to load timeline');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (event: TimelineEvent) => {
    if (!event.status) return null;
    const statusColors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      bound: 'bg-green-100 text-green-800',
      submitted: 'bg-blue-100 text-blue-800',
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      approved: 'bg-green-100 text-green-800',
      denied: 'bg-red-100 text-red-800',
      expired: 'bg-red-100 text-red-800',
      upcoming: 'bg-orange-100 text-orange-800',
      settled: 'bg-green-100 text-green-800',
      analyzed: 'bg-blue-100 text-blue-800',
    };
    const colorClass = statusColors[event.status] || 'bg-gray-100 text-gray-700';
    return (
      <Badge className={`${colorClass} text-[10px] px-1.5 py-0 capitalize border-0`}>
        {event.status.replace(/_/g, ' ')}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </button>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#F7941D]" />
          <span className="ml-3 text-gray-500">Loading timeline...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </button>
        <Card className="border-0 shadow-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-red-600 font-medium">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back to Policy</span>
      </button>

      {/* Header */}
      {policy && (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-[#1B3A5F] to-[#2C5282] text-white overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Policy Timeline</h2>
                <p className="text-sm text-blue-200">{policy.policy_number}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3 text-sm text-blue-100">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>{policy.business_name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span className="capitalize">{policy.segment}</span>
              </div>
            </div>
            <p className="text-xs text-blue-300 mt-2">
              {events.length} event{events.length !== 1 ? 's' : ''} recorded
            </p>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      {events.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="p-8 text-center">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No timeline events yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

          <div className="space-y-4">
            {events.map((event, idx) => (
              <div key={event.id} className="relative flex gap-4">
                {/* Dot */}
                <div className={`relative z-10 w-12 h-12 rounded-full ${event.color} flex items-center justify-center text-white shadow-md flex-shrink-0`}>
                  {event.icon}
                </div>

                {/* Content */}
                <Card className="flex-1 border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-semibold text-sm text-gray-800 leading-tight">
                        {event.title}
                      </h4>
                      {getStatusBadge(event)}
                    </div>
                    <p className="text-xs text-gray-500 mb-1.5">
                      {formatDateTime(event.date)}
                    </p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {event.description}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refresh */}
      <div className="text-center pt-2 pb-4">
        <button
          onClick={fetchTimelineData}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#F7941D] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Timeline
        </button>
      </div>
    </div>
  );
};

export default PolicyTimeline;
