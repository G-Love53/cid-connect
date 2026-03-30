import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Mail,
  User,
  Filter,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { getUserCoiRequests } from '@/api';
import { COIRequest } from '@/types';

interface COIRequestHistoryProps {
  onBack: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  submitted: {
    label: 'Submitted',
    color: 'bg-blue-100 text-blue-800',
    icon: <Clock className="w-3 h-3" />
  },
  processing: {
    label: 'Processing',
    color: 'bg-yellow-100 text-yellow-800',
    icon: <Loader2 className="w-3 h-3 animate-spin" />
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-100 text-green-800',
    icon: <CheckCircle2 className="w-3 h-3" />
  },
  failed: {
    label: 'Failed',
    color: 'bg-red-100 text-red-800',
    icon: <XCircle className="w-3 h-3" />
  }
};

const COIRequestHistory: React.FC<COIRequestHistoryProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<COIRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getUserCoiRequests(user.id);
      setRequests(data);
    } catch (err) {
      console.error('Error fetching COI requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = statusFilter === 'all'
    ? requests
    : requests.filter(r => r.status === statusFilter);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Services</span>
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1B3A5F]/10 rounded-lg">
            <FileText className="w-6 h-6 text-[#1B3A5F]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">COI Request History</h1>
            <p className="text-sm text-gray-500">Track your certificate requests</p>
          </div>
        </div>
        <Button
          onClick={fetchRequests}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-500">
          {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Loading */}
      {loading ? (
        <Card className="border-0 shadow-md">
          <CardContent className="p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#F7941D]" />
            <span className="ml-2 text-gray-600">Loading requests...</span>
          </CardContent>
        </Card>
      ) : filteredRequests.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No COI requests found</p>
            <p className="text-sm text-gray-400 mt-1">
              {statusFilter !== 'all'
                ? `No requests with status "${statusFilter}"`
                : 'Your certificate requests will appear here'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => {
            const statusInfo = STATUS_CONFIG[request.status] || STATUS_CONFIG.submitted;
            return (
              <Card key={request.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <code className="text-sm font-mono font-bold text-[#1B3A5F]">
                        {request.request_number}
                      </code>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDate(request.created_at)}
                      </p>
                    </div>
                    <Badge className={`${statusInfo.color} flex items-center gap-1`}>
                      {statusInfo.icon}
                      {statusInfo.label}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-700 font-medium">
                        {request.certificate_holder_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600">
                        {request.delivery_email}
                      </span>
                    </div>

                    {request.certificate_type && request.certificate_type !== 'standard' && (
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-600 capitalize">
                          {request.certificate_type.replace(/_/g, ' ')}
                        </span>
                      </div>
                    )}

                    {request.segment && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {request.segment}
                      </Badge>
                    )}
                  </div>

                  {/* Generated PDF link */}
                  {request.generated_pdf_url && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <a
                        href={request.generated_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-[#F7941D] hover:text-[#E07D0D] font-medium"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Download Certificate
                      </a>
                    </div>
                  )}

                  {/* Backend warning */}
                  {request.backend_response?.warning && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-amber-600">
                        Backend notification pending — our team will process manually.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default COIRequestHistory;
