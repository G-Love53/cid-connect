import React, { useState, useEffect } from 'react';
import {
  UserCheck, Loader2, RefreshCw, AlertTriangle, Users, X, Clock,
  RotateCw, XCircle, CheckCircle, Timer
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Claim } from '@/types';
import {
  getAllClaims, getStaffProfiles, assignClaim, unassignClaim,
  getProfileNamesByIds, logAdminAction,
  getRetryQueueRows, retryRetryQueueNow, cancelRetryQueueItem,
  triggerProcessRetryQueue, formatRelativeTime,
  type UserProfile, type RetryQueueItem
} from '@/api';
import { useAuth } from '@/contexts/AuthContext';

const AdminClaimAssignments: React.FC = () => {
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<UserProfile[]>([]);
  const [assigneeNames, setAssigneeNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  // Retry queue state
  const [retryItems, setRetryItems] = useState<RetryQueueItem[]>([]);
  const [retryLoading, setRetryLoading] = useState(false);
  const [processingRetry, setProcessingRetry] = useState(false);
  const [retryActionId, setRetryActionId] = useState<string | null>(null);

  useEffect(() => { fetchData(); fetchRetryQueue(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [claimsData, staffData] = await Promise.all([
        getAllClaims(),
        getStaffProfiles()
      ]);
      setClaims(claimsData);
      setStaffProfiles(staffData);

      const assignedIds = claimsData.filter(c => c.assigned_to).map(c => c.assigned_to!);
      const uniqueIds = [...new Set(assignedIds)];
      if (uniqueIds.length > 0) {
        const names = await getProfileNamesByIds(uniqueIds);
        setAssigneeNames(names);
      }
    } catch (err) {
      console.error('Error fetching assignment data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRetryQueue = async () => {
    setRetryLoading(true);
    const items = await getRetryQueueRows({ limit: 50 });
    setRetryItems(items);
    setRetryLoading(false);
  };

  const unassignedClaims = claims.filter(c => !c.assigned_to && !['closed', 'denied'].includes(c.status));
  const assignedClaims = claims.filter(c => c.assigned_to);

  const handleAssign = async (claimId: string, assigneeId: string) => {
    setAssigningId(claimId);
    const ok = await assignClaim(claimId, assigneeId);
    setAssigningId(null);
    if (ok) {
      toast({ title: 'Claim Assigned', description: 'Claim has been assigned to staff member.' });
      if (user) {
        const staff = staffProfiles.find(s => s.id === assigneeId);
        logAdminAction({
          admin_user_id: user.id,
          admin_email: user.email,
          action: 'claim_assigned',
          entity_type: 'claim',
          entity_id: claimId,
          details: { assigned_to: assigneeId, assigned_name: staff?.full_name || staff?.email }
        }).catch(() => {});
      }
      fetchData();
    } else {
      toast({ title: 'Error', description: 'Failed to assign claim', variant: 'destructive' });
    }
  };

  const handleUnassign = async (claimId: string) => {
    setAssigningId(claimId);
    const ok = await unassignClaim(claimId);
    setAssigningId(null);
    if (ok) {
      toast({ title: 'Claim Unassigned' });
      fetchData();
    } else {
      toast({ title: 'Error', description: 'Failed to unassign claim', variant: 'destructive' });
    }
  };

  const handleProcessRetryQueue = async () => {
    setProcessingRetry(true);
    const result = await triggerProcessRetryQueue();
    setProcessingRetry(false);
    if (result.success) {
      toast({ title: 'Retry Queue Processed', description: `${result.processed || 0} items processed` });
      fetchRetryQueue();
    } else {
      toast({ title: 'Error', description: result.error || 'Failed', variant: 'destructive' });
    }
  };

  const handleManualRetry = async (id: string) => {
    setRetryActionId(id);
    const ok = await retryRetryQueueNow(id);
    setRetryActionId(null);
    if (ok) {
      toast({ title: 'Retry Queued', description: 'Item will be retried on next processor run.' });
      fetchRetryQueue();
    } else {
      toast({ title: 'Error', description: 'Failed to queue retry', variant: 'destructive' });
    }
  };

  const handleCancelRetry = async (id: string) => {
    setRetryActionId(id);
    const ok = await cancelRetryQueueItem(id);
    setRetryActionId(null);
    if (ok) {
      toast({ title: 'Retry Cancelled' });
      fetchRetryQueue();
    } else {
      toast({ title: 'Error', description: 'Failed to cancel', variant: 'destructive' });
    }
  };

  const getRetryStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-700 text-xs flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />Pending</Badge>;
      case 'processing': return <Badge className="bg-blue-100 text-blue-700 text-xs flex items-center gap-0.5"><Loader2 className="w-2.5 h-2.5 animate-spin" />Processing</Badge>;
      case 'succeeded': return <Badge className="bg-green-100 text-green-700 text-xs flex items-center gap-0.5"><CheckCircle className="w-2.5 h-2.5" />Succeeded</Badge>;
      case 'failed': return <Badge className="bg-red-100 text-red-700 text-xs flex items-center gap-0.5"><XCircle className="w-2.5 h-2.5" />Failed</Badge>;
      case 'cancelled': return <Badge className="bg-gray-100 text-gray-600 text-xs">Cancelled</Badge>;
      default: return <Badge className="bg-gray-100 text-gray-600 text-xs">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span className="ml-2 text-gray-600">Loading assignments...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Assignments Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-800">Claim Assignments</h3>
          <Badge className="bg-amber-100 text-amber-700 text-xs">{unassignedClaims.length} unassigned</Badge>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm" className="flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </div>

      {/* Unassigned Claims */}
      {unassignedClaims.length === 0 ? (
        <Card className="border-0 shadow-sm bg-green-50">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-sm text-green-700">All active claims are assigned</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 font-medium">Unassigned Claims ({unassignedClaims.length})</p>
          {unassignedClaims.slice(0, 20).map(claim => (
            <Card key={claim.id} className="border-0 shadow-sm border-l-4 border-l-amber-400">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono font-bold text-[#1B3A5F]">{claim.claim_number || 'Pending'}</code>
                    <Badge className="bg-blue-100 text-blue-700 text-xs">{claim.status.replace(/_/g, ' ')}</Badge>
                    {claim.segment && <Badge variant="outline" className="text-xs capitalize">{claim.segment}</Badge>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{claim.description}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {assigningId === claim.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                  ) : (
                    <Select onValueChange={(v) => handleAssign(claim.id, v)}>
                      <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue placeholder="Assign to..." />
                      </SelectTrigger>
                      <SelectContent>
                        {staffProfiles.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.full_name || s.email || s.id.substring(0, 8)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Staff workload summary */}
      {staffProfiles.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Staff Workload
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {staffProfiles.map(staff => {
                const count = assignedClaims.filter(c => c.assigned_to === staff.id && !['closed', 'denied'].includes(c.status)).length;
                return (
                  <div key={staff.id} className="p-2 bg-gray-50 rounded text-center">
                    <p className="text-lg font-bold text-gray-800">{count}</p>
                    <p className="text-xs text-gray-500 truncate">{staff.full_name || staff.email || 'Staff'}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Retry Queue Section */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <Timer className="w-5 h-5 text-orange-600" />
          <h3 className="font-semibold text-gray-800">Retry Queue</h3>
          <Badge className="bg-orange-100 text-orange-700 text-xs">
            {retryItems.filter(r => r.status === 'pending' || r.status === 'processing').length} active
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleProcessRetryQueue} disabled={processingRetry} variant="outline" size="sm" className="flex items-center gap-1 text-orange-600 border-orange-200 hover:bg-orange-50">
            {processingRetry ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
            Process Now
          </Button>
          <Button onClick={fetchRetryQueue} variant="outline" size="sm" className="flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
        </div>
      </div>

      {retryLoading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
            <span className="ml-2 text-gray-600 text-sm">Loading retry queue...</span>
          </CardContent>
        </Card>
      ) : retryItems.length === 0 ? (
        <Card className="border-0 shadow-sm bg-green-50">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-sm text-green-700">No items in retry queue</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {retryItems.map(item => (
            <Card key={item.id} className="border-0 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getRetryStatusBadge(item.status)}
                      <span className="text-xs font-mono text-gray-500">{item.target_function}</span>
                      <span className="text-xs text-gray-400">
                        {item.retry_count}/{item.max_retries} retries
                      </span>
                    </div>
                    {item.last_error && (
                      <p className="text-xs text-red-500 mt-1 truncate">{item.last_error}</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Next: {new Date(item.next_retry_at).toLocaleString()} · Created {formatRelativeTime(item.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {(item.status === 'pending' || item.status === 'failed') && (
                      <>
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 px-2 text-xs text-orange-600 hover:bg-orange-50"
                          disabled={retryActionId === item.id}
                          onClick={() => handleManualRetry(item.id)}
                        >
                          {retryActionId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 px-2 text-xs text-red-500 hover:bg-red-50"
                          disabled={retryActionId === item.id}
                          onClick={() => handleCancelRetry(item.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminClaimAssignments;
