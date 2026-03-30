import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, AlertTriangle, Clock, CheckCircle2, XCircle,
  Loader2, RefreshCw, MapPin, Calendar, Camera, Filter, Eye,
  DollarSign, FileWarning, UserCheck
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { getUserClaims, getProfileNamesByIds } from '@/api';
import { Claim } from '@/types';

interface ClaimHistoryProps {
  onBack: () => void;
  onOpenClaim?: (claim: Claim) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-800', icon: <Clock className="w-3 h-3" /> },
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-3 h-3" /> },
  under_review: { label: 'Under Review', color: 'bg-purple-100 text-purple-800', icon: <Eye className="w-3 h-3" /> },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="w-3 h-3" /> },
  denied: { label: 'Denied', color: 'bg-red-100 text-red-800', icon: <XCircle className="w-3 h-3" /> },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-700', icon: <CheckCircle2 className="w-3 h-3" /> }
};

const ClaimHistory: React.FC<ClaimHistoryProps> = ({ onBack, onOpenClaim }) => {
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assigneeNames, setAssigneeNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) fetchClaims();
  }, [user]);

  const fetchClaims = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getUserClaims(user.id);
      setClaims(data);
      // Batch lookup assigned_to names
      const assignedIds = data.filter(c => c.assigned_to).map(c => c.assigned_to!);
      const uniqueIds = [...new Set(assignedIds)];
      if (uniqueIds.length > 0) {
        const names = await getProfileNamesByIds(uniqueIds);
        setAssigneeNames(names);
      }
    } catch (err) {
      console.error('Error fetching claims:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredClaims = statusFilter === 'all'
    ? claims
    : claims.filter(c => c.status === statusFilter);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const formatDateTime = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const truncateDescription = (desc: string, maxLen: number = 80) =>
    desc.length <= maxLen ? desc : desc.substring(0, maxLen).trim() + '...';

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors">
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Services</span>
      </button>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#F7941D]/10 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-[#F7941D]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Claim History</h1>
            <p className="text-sm text-gray-500">Track your filed claims</p>
          </div>
        </div>
        <Button onClick={fetchClaims} variant="outline" size="sm" className="flex items-center gap-2" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="denied">Denied</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-500">
          {filteredClaims.length} claim{filteredClaims.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <Card className="border-0 shadow-md">
          <CardContent className="p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#F7941D]" />
            <span className="ml-2 text-gray-600">Loading claims...</span>
          </CardContent>
        </Card>
      ) : filteredClaims.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No claims found</p>
            <p className="text-sm text-gray-400 mt-1">
              {statusFilter !== 'all'
                ? `No claims with status "${statusFilter.replace('_', ' ')}"`
                : 'Your filed claims will appear here'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredClaims.map((claim) => {
            const statusInfo = STATUS_CONFIG[claim.status] || STATUS_CONFIG.submitted;
            const photoCount = claim.photos?.length || 0;
            const assigneeName = claim.assigned_to ? assigneeNames[claim.assigned_to] : null;

            return (
              <Card
                key={claim.id}
                className={`border-0 shadow-md hover:shadow-lg transition-shadow ${onOpenClaim ? 'cursor-pointer' : ''}`}
                onClick={() => onOpenClaim?.(claim)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <code className="text-sm font-mono font-bold text-[#1B3A5F]">
                        {claim.claim_number || 'Pending'}
                      </code>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Filed {formatDateTime(claim.created_at)}
                      </p>
                    </div>
                    <Badge className={`${statusInfo.color} flex items-center gap-1`}>
                      {statusInfo.icon}
                      {statusInfo.label}
                    </Badge>
                  </div>

                  {claim.claim_type && (
                    <div className="mb-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        <FileWarning className="w-3 h-3 mr-1" />
                        {claim.claim_type.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-700">Incident: {formatDate(claim.incident_date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600">{claim.incident_location}</span>
                    </div>
                    <p className="text-sm text-gray-500 pl-6">{truncateDescription(claim.description)}</p>

                    <div className="flex items-center gap-4 pt-1">
                      {photoCount > 0 && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
                          <Camera className="w-4 h-4 text-gray-400" />
                          <span>{photoCount} photo{photoCount !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {claim.estimated_amount != null && claim.estimated_amount > 0 && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <span>Est. ${claim.estimated_amount.toLocaleString()}</span>
                        </div>
                      )}
                      {claim.segment && (
                        <Badge variant="outline" className="text-xs capitalize ml-auto">
                          {claim.segment}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Assigned admin */}
                  {assigneeName && (
                    <div className="mt-3 pt-3 border-t border-gray-100 text-sm">
                      <p className="text-gray-500 flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-indigo-500" />
                        Assigned to: <span className="font-medium text-gray-700">{assigneeName}</span>
                        {claim.assigned_at && (
                          <span className="text-gray-400 text-xs ml-1">
                            ({formatDate(claim.assigned_at)})
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Adjuster info if assigned */}
                  {claim.adjuster_name && (
                    <div className="mt-3 pt-3 border-t border-gray-100 text-sm">
                      <p className="text-gray-500">
                        Adjuster: <span className="font-medium text-gray-700">{claim.adjuster_name}</span>
                        {claim.adjuster_phone && (
                          <span className="ml-2 text-gray-400">({claim.adjuster_phone})</span>
                        )}
                      </p>
                    </div>
                  )}

                  {claim.backend_response?.warning && (
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

export default ClaimHistory;

