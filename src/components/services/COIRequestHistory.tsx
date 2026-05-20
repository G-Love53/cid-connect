import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Mail,
  User,
  Filter,
  ExternalLink,
  MapPin,
  Calendar,
  RotateCcw,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { getUserCoiRequests } from '@/api';
import { COIRequest } from '@/types';
import CoiStatusPipeline from '@/components/coi/CoiStatusPipeline';
import CertificateHolderBook from '@/components/coi/CertificateHolderBook';
import {
  extractCertificateHolders,
  formatCertificateType,
  formatCoiStatus,
  getCoiDownloadUrl,
  holderToPrefill,
  requestToPrefill,
  type CertificateHolder,
} from '@/lib/coiUtils';

interface COIRequestHistoryProps {
  onBack: () => void;
  onReissue: (prefill: ReturnType<typeof holderToPrefill>) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  submitted: {
    label: 'Received',
    color: 'bg-blue-100 text-blue-800',
    icon: <Loader2 className="w-3 h-3" />,
  },
  processing: {
    label: 'Generating',
    color: 'bg-yellow-100 text-yellow-800',
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
  },
  completed: {
    label: 'Sent',
    color: 'bg-green-100 text-green-800',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  failed: {
    label: 'Needs attention',
    color: 'bg-red-100 text-red-800',
    icon: <XCircle className="w-3 h-3" />,
  },
};

const COIRequestHistory: React.FC<COIRequestHistoryProps> = ({ onBack, onReissue }) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<COIRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [holders, setHolders] = useState<CertificateHolder[]>([]);

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
      setHolders(extractCertificateHolders(data));
    } catch (err) {
      console.error('Error fetching COI requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = statusFilter === 'all'
    ? requests
    : requests.filter((r) => r.status === statusFilter);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to COI</span>
      </button>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1B3A5F]/10 rounded-lg">
            <FileText className="w-6 h-6 text-[#1B3A5F]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">COI Tracking</h1>
            <p className="text-sm text-gray-500">Who, what, and when for every certificate</p>
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

      {!loading && holders.length > 0 && (
        <CertificateHolderBook
          holders={holders}
          onReissue={(holder) => onReissue(holderToPrefill(holder))}
        />
      )}

      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="submitted">Received</SelectItem>
            <SelectItem value="processing">Generating</SelectItem>
            <SelectItem value="completed">Sent</SelectItem>
            <SelectItem value="failed">Needs attention</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-500">
          {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
        </span>
      </div>

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
            const downloadUrl = getCoiDownloadUrl(request);
            return (
              <Card key={request.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <code className="text-sm font-mono font-bold text-[#1B3A5F]">
                        {request.request_number}
                      </code>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        Requested {formatDate(request.created_at)}
                      </div>
                      {request.updated_at && request.status === 'completed' && (
                        <div className="text-xs text-green-700 mt-0.5">
                          Completed {formatDate(request.updated_at)}
                        </div>
                      )}
                    </div>
                    <Badge className={`${statusInfo.color} flex items-center gap-1 shrink-0`}>
                      {statusInfo.icon}
                      {statusInfo.label}
                    </Badge>
                  </div>

                  <CoiStatusPipeline status={request.status} />

                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-gray-800 font-medium">{request.certificate_holder_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-gray-600">{request.delivery_email}</span>
                    </div>
                    {(request.certificate_holder_address || request.certificate_holder_city) && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                        <span className="text-gray-600">
                          {[
                            request.certificate_holder_address,
                            request.certificate_holder_city,
                            request.certificate_holder_state,
                            request.certificate_holder_zip,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-gray-600">{formatCertificateType(request.certificate_type)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {request.segment && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {request.segment}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {formatCoiStatus(request.status)}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onReissue(requestToPrefill(request))}
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Reissue
                    </Button>
                    {downloadUrl && (
                      <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-[#F7941D] hover:text-[#E07D0D] font-medium px-3 py-1.5"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Download certificate
                      </a>
                    )}
                  </div>

                  {request.backend_response?.warning && (
                    <p className="text-xs text-amber-600">
                      Backend notification pending — our team will process manually.
                    </p>
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
