import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Shield, 
  FileText, 
  Users, 
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Building2,
  TrendingUp,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Eye,
  Edit2,
  Link as LinkIcon,
  Save,
  Loader2,
  BarChart3,
  Mail,
  Bell,
  CheckSquare,
  Square,
  X,
  Download,
  ClipboardList,
  Activity,
  Send,
  PieChart
} from 'lucide-react';




import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { Policy, Claim, COIRequest } from '@/types';
import { 
  isStaffOrAdmin, 
  getAllPolicies, 
  getAllClaims, 
  getAdminDashboardStats,
  updateClaimStatus,
  updateClaimSettlement,
  getAllCoiRequests,
  updateCoiRequestStatus,
  updateCoiRequestPdfUrl,
  getUserEmailById,
  sendStatusNotification,
  logAdminAction,
  downloadAllClaimsReportCsv,
  getSegmentColorClass
} from '@/api';

import { toast } from '@/components/ui/use-toast';
import AnalyticsTab from './AnalyticsTab';
import AuditLogTab from './AuditLogTab';
import EmailTemplatesTab from './EmailTemplatesTab';
import AdminUsersTab from './AdminUsersTab';
import AdminOverviewLive from './AdminOverviewLive';
import AdminBulkQuoteEmail from './AdminBulkQuoteEmail';
import AdminRenewalAlerts from './AdminRenewalAlerts';
import AdminClaimsCharts from './AdminClaimsCharts';
import WebhookLogTab from './WebhookLogTab';
import WebhookRulesTab from './WebhookRulesTab';
import AdminClaimAssignments from './AdminClaimAssignments';





interface AdminDashboardProps {
  onBack: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [coiRequests, setCoiRequests] = useState<COIRequest[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Filters
  const [policySearch, setPolicySearch] = useState('');
  const [policySegmentFilter, setPolicySegmentFilter] = useState('all');
  const [policyStatusFilter, setPolicyStatusFilter] = useState('all');
  const [claimSearch, setClaimSearch] = useState('');
  const [claimSegmentFilter, setClaimSegmentFilter] = useState('all');
  const [claimStatusFilter, setClaimStatusFilter] = useState('all');
  const [coiSearch, setCoiSearch] = useState('');
  const [coiStatusFilter, setCoiStatusFilter] = useState('all');
  
  // Expanded rows
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);
  const [expandedClaim, setExpandedClaim] = useState<string | null>(null);
  const [expandedCoi, setExpandedCoi] = useState<string | null>(null);

  // COI PDF URL editing
  const [editingPdfUrl, setEditingPdfUrl] = useState<string | null>(null);
  const [pdfUrlInput, setPdfUrlInput] = useState('');
  const [savingPdfUrl, setSavingPdfUrl] = useState(false);

  // Settlement editing
  const [editingSettlement, setEditingSettlement] = useState<string | null>(null);
  const [settlementAmountInput, setSettlementAmountInput] = useState('');
  const [settlementDateInput, setSettlementDateInput] = useState('');
  const [savingSettlement, setSavingSettlement] = useState(false);

  // Bulk claim actions
  const [selectedClaimIds, setSelectedClaimIds] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Bulk COI actions
  const [selectedCoiIds, setSelectedCoiIds] = useState<Set<string>>(new Set());
  const [bulkCoiUpdating, setBulkCoiUpdating] = useState(false);

  // Claims CSV download
  const [downloadingClaimsCsv, setDownloadingClaimsCsv] = useState(false);

  // Audit helper
  const auditLog = (action: string, entity_type: string, entity_id?: string, details?: Record<string, any>) => {
    if (!user) return;
    logAdminAction({
      admin_user_id: user.id,
      admin_email: user.email,
      action,
      entity_type,
      entity_id,
      details
    }).catch(err => console.warn('Audit log error:', err));
  };


  useEffect(() => {
    checkAuthorizationAndFetchData();
  }, [user]);

  const checkAuthorizationAndFetchData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const hasAccess = await isStaffOrAdmin(user.id);
      setAuthorized(hasAccess);

      if (hasAccess) {
        await fetchAllData();
      }
    } catch (err) {
      console.error('Error checking authorization:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    try {
      const [policiesData, claimsData, statsData, coiData] = await Promise.all([
        getAllPolicies(),
        getAllClaims(),
        getAdminDashboardStats(),
        getAllCoiRequests()
      ]);

      setPolicies(policiesData);
      setClaims(claimsData);
      setStats(statsData);
      setCoiRequests(coiData);
    } catch (err) {
      console.error('Error fetching admin data:', err);
      toast({
        title: 'Error',
        description: 'Failed to load admin data',
        variant: 'destructive'
      });
    }
  };

  // --- Notification helpers ---
  const afterClaimStatusUpdate = async (userId: string, claimNumber: string | null, newStatus: string) => {
    if (!claimNumber) return;
    try {
      const email = await getUserEmailById(userId);
      if (!email) {
        console.warn('No email found for user', userId);
        return;
      }
      const result = await sendStatusNotification({
        user_email: email,
        reference_number: claimNumber,
        entity_type: 'claim',
        new_status: newStatus
      });
      if (result.success) {
        toast({ title: 'Notification Sent', description: `Email sent to ${email}` });
      } else {
        toast({ title: 'Notification Warning', description: result.error || 'Email may not have been delivered', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Notification error (claim):', err);
    }
  };

  const afterCoiStatusUpdate = async (userId: string, requestNumber: string, newStatus: string) => {
    // Only notify on completed or failed
    if (newStatus !== 'completed' && newStatus !== 'failed') return;
    try {
      const email = await getUserEmailById(userId);
      if (!email) {
        console.warn('No email found for user', userId);
        return;
      }
      const result = await sendStatusNotification({
        user_email: email,
        reference_number: requestNumber,
        entity_type: 'coi',
        new_status: newStatus
      });
      if (result.success) {
        toast({ title: 'Notification Sent', description: `Email sent to ${email}` });
      } else {
        toast({ title: 'Notification Warning', description: result.error || 'Email may not have been delivered', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Notification error (COI):', err);
    }
  };

  // Settlement notification
  const afterSettlementSaved = async (claim: Claim, amount: number | null, date: string | null) => {
    if (!claim.claim_number) return;
    try {
      const email = await getUserEmailById(claim.user_id);
      if (!email) {
        console.warn('No email found for user', claim.user_id);
        return;
      }
      const lines: string[] = [];
      if (amount != null) lines.push(`Settlement amount: $${amount.toLocaleString()}`);
      if (date) lines.push(`Settlement date: ${date}`);
      const result = await sendStatusNotification({
        user_email: email,
        reference_number: claim.claim_number,
        entity_type: 'claim',
        new_status: 'settlement_set',
        extra_context: lines.join('\n') || undefined
      });
      if (result.success) {
        toast({ title: 'Settlement Email Sent', description: `Notification sent to ${email}` });
      } else {
        toast({ title: 'Email Warning', description: result.error || 'Settlement email may not have been delivered', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Settlement notification error:', err);
    }
  };


  // --- Single claim status update ---
  const handleClaimStatusUpdate = async (claimId: string, newStatus: string) => {
    const success = await updateClaimStatus(claimId, newStatus);
    if (success) {
      toast({
        title: 'Status Updated',
        description: `Claim status changed to ${newStatus}`
      });
      const claim = claims.find(c => c.id === claimId);
      if (claim) {
        afterClaimStatusUpdate(claim.user_id, claim.claim_number, newStatus);
        auditLog('claim_status_change', 'claim', claimId, {
          claim_number: claim.claim_number,
          new_status: newStatus
        });
      }
      await fetchAllData();
    } else {
      toast({
        title: 'Error',
        description: 'Failed to update claim status',
        variant: 'destructive'
      });
    }
  };

  // --- Bulk claim actions ---
  const toggleClaimSelection = (claimId: string) => {
    setSelectedClaimIds(prev => {
      const next = new Set(prev);
      if (next.has(claimId)) {
        next.delete(claimId);
      } else {
        next.add(claimId);
      }
      return next;
    });
  };

  const toggleSelectAllClaims = () => {
    if (selectedClaimIds.size === filteredClaims.length) {
      setSelectedClaimIds(new Set());
    } else {
      setSelectedClaimIds(new Set(filteredClaims.map(c => c.id)));
    }
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    const count = selectedClaimIds.size;
    if (count === 0) return;

    const statusLabel = newStatus.replace('_', ' ');
    const confirmed = window.confirm(
      `Update ${count} claim${count > 1 ? 's' : ''} to "${statusLabel}"?\n\nThis sends one email per claim.`
    );
    if (!confirmed) return;

    setBulkUpdating(true);
    let successCount = 0;
    const failedIds: string[] = [];

    for (const claimId of Array.from(selectedClaimIds)) {
      try {
        const ok = await updateClaimStatus(claimId, newStatus);
        if (ok) {
          successCount++;
          const claim = claims.find(c => c.id === claimId);
          if (claim) {
            await afterClaimStatusUpdate(claim.user_id, claim.claim_number, newStatus);
          }
        } else {
          failedIds.push(claimId);
        }
      } catch (err) {
        console.error(`Bulk update failed for claim ${claimId}:`, err);
        failedIds.push(claimId);
      }
    }

    // Audit log for bulk action
    auditLog('claim_bulk_update', 'claim', undefined, {
      new_status: newStatus,
      count,
      success_count: successCount,
      failed_count: failedIds.length
    });

    setBulkUpdating(false);
    setSelectedClaimIds(new Set());
    await fetchAllData();

    if (failedIds.length === 0) {
      toast({
        title: 'Bulk Update Complete',
        description: `Updated ${successCount} claim${successCount > 1 ? 's' : ''} to "${statusLabel}"`
      });
    } else {
      toast({
        title: 'Partial Success',
        description: `${successCount} updated, ${failedIds.length} failed`,
        variant: 'destructive'
      });
    }
  };

  // --- Single COI status update ---
  const handleCoiStatusUpdate = async (requestId: string, newStatus: string) => {
    const success = await updateCoiRequestStatus(requestId, newStatus);
    if (success) {
      toast({
        title: 'Status Updated',
        description: `COI request status changed to ${newStatus}`
      });
      const req = coiRequests.find(r => r.id === requestId);
      if (req) {
        afterCoiStatusUpdate(req.user_id, req.request_number, newStatus);
        auditLog('coi_status_change', 'coi_request', requestId, {
          request_number: req.request_number,
          new_status: newStatus
        });
      }
      await fetchAllData();
    } else {
      toast({
        title: 'Error',
        description: 'Failed to update COI request status',
        variant: 'destructive'
      });
    }
  };

  // --- Bulk COI actions ---
  const toggleCoiSelection = (coiId: string) => {
    setSelectedCoiIds(prev => {
      const next = new Set(prev);
      if (next.has(coiId)) {
        next.delete(coiId);
      } else {
        next.add(coiId);
      }
      return next;
    });
  };

  const toggleSelectAllCois = () => {
    if (selectedCoiIds.size === filteredCoiRequests.length) {
      setSelectedCoiIds(new Set());
    } else {
      setSelectedCoiIds(new Set(filteredCoiRequests.map(r => r.id)));
    }
  };

  const handleBulkCoiStatusUpdate = async (targetStatus: 'processing' | 'completed' | 'failed') => {
    const count = selectedCoiIds.size;
    if (count === 0) return;

    const statusLabel = targetStatus;
    const confirmed = window.confirm(
      `Update ${count} COI request${count > 1 ? 's' : ''} to "${statusLabel}"?\n\nNotification emails will be sent for completed/failed status.`
    );
    if (!confirmed) return;

    setBulkCoiUpdating(true);
    let successCount = 0;
    const failedIds: string[] = [];

    for (const coiId of Array.from(selectedCoiIds)) {
      try {
        const ok = await updateCoiRequestStatus(coiId, targetStatus);
        if (ok) {
          successCount++;
          const req = coiRequests.find(r => r.id === coiId);
          if (req) {
            await afterCoiStatusUpdate(req.user_id, req.request_number, targetStatus);
          }
        } else {
          failedIds.push(coiId);
        }
      } catch (err) {
        console.error(`Bulk COI update failed for ${coiId}:`, err);
        failedIds.push(coiId);
      }
    }

    // Audit log for bulk COI action
    auditLog('coi_bulk_update', 'coi_request', undefined, {
      new_status: targetStatus,
      count,
      success_count: successCount,
      failed_count: failedIds.length
    });

    setBulkCoiUpdating(false);
    setSelectedCoiIds(new Set());
    await fetchAllData();

    if (failedIds.length === 0) {
      toast({
        title: 'Bulk Update Complete',
        description: `Updated ${successCount} COI request${successCount > 1 ? 's' : ''} to "${statusLabel}"`
      });
    } else {
      toast({
        title: 'Partial Success',
        description: `${successCount} updated, ${failedIds.length} failed`,
        variant: 'destructive'
      });
    }
  };


  const handleSavePdfUrl = async (requestId: string) => {
    if (!pdfUrlInput.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a valid URL',
        variant: 'destructive'
      });
      return;
    }

    setSavingPdfUrl(true);
    const success = await updateCoiRequestPdfUrl(requestId, pdfUrlInput.trim());
    setSavingPdfUrl(false);

    if (success) {
      toast({
        title: 'PDF URL Saved',
        description: 'Generated PDF URL has been set'
      });
      const req = coiRequests.find(r => r.id === requestId);
      auditLog('coi_pdf_url', 'coi_request', requestId, {
        request_number: req?.request_number,
        pdf_url: pdfUrlInput.trim()
      });
      setEditingPdfUrl(null);
      setPdfUrlInput('');
      await fetchAllData();
    } else {
      toast({
        title: 'Error',
        description: 'Failed to save PDF URL',
        variant: 'destructive'
      });
    }
  };

  // --- Claims CSV download ---
  const handleDownloadClaimsCsv = async () => {
    setDownloadingClaimsCsv(true);
    try {
      await downloadAllClaimsReportCsv();
      toast({ title: 'Download Started', description: 'Claims report CSV is downloading.' });
    } catch (err: any) {
      console.error('CSV download error:', err);
      toast({ title: 'Download Failed', description: err.message || 'Could not generate claims report.', variant: 'destructive' });
    } finally {
      setDownloadingClaimsCsv(false);
    }
  };

  // Filter policies
  const filteredPolicies = policies.filter(policy => {
    const matchesSearch = 
      policy.policy_number.toLowerCase().includes(policySearch.toLowerCase()) ||
      policy.business_name.toLowerCase().includes(policySearch.toLowerCase());
    const matchesSegment = policySegmentFilter === 'all' || policy.segment === policySegmentFilter;
    const matchesStatus = policyStatusFilter === 'all' || policy.status === policyStatusFilter;
    return matchesSearch && matchesSegment && matchesStatus;
  });

  // Filter claims
  const filteredClaims = claims.filter(claim => {
    const matchesSearch = 
      (claim.claim_number?.toLowerCase() || '').includes(claimSearch.toLowerCase()) ||
      claim.description.toLowerCase().includes(claimSearch.toLowerCase());
    const matchesSegment = claimSegmentFilter === 'all' || claim.segment === claimSegmentFilter;
    const matchesStatus = claimStatusFilter === 'all' || claim.status === claimStatusFilter;
    return matchesSearch && matchesSegment && matchesStatus;
  });

  // Filter COI requests
  const filteredCoiRequests = coiRequests.filter(req => {
    const matchesSearch = 
      req.request_number.toLowerCase().includes(coiSearch.toLowerCase()) ||
      req.certificate_holder_name.toLowerCase().includes(coiSearch.toLowerCase()) ||
      req.delivery_email.toLowerCase().includes(coiSearch.toLowerCase());
    const matchesStatus = coiStatusFilter === 'all' || req.status === coiStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      'active': { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
      'submitted': { color: 'bg-blue-100 text-blue-800', icon: <Clock className="w-3 h-3" /> },
      'pending': { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-3 h-3" /> },
      'processing': { color: 'bg-yellow-100 text-yellow-800', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
      'under_review': { color: 'bg-purple-100 text-purple-800', icon: <Eye className="w-3 h-3" /> },
      'approved': { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
      'completed': { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
      'denied': { color: 'bg-red-100 text-red-800', icon: <XCircle className="w-3 h-3" /> },
      'failed': { color: 'bg-red-100 text-red-800', icon: <XCircle className="w-3 h-3" /> },
      'closed': { color: 'bg-gray-100 text-gray-800', icon: <CheckCircle className="w-3 h-3" /> },
      'expired': { color: 'bg-gray-100 text-gray-600', icon: <XCircle className="w-3 h-3" /> },
      'cancelled': { color: 'bg-red-100 text-red-800', icon: <XCircle className="w-3 h-3" /> }
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', icon: null };

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        {config.icon}
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getSegmentBadge = (segment: string) => {
    // Dynamic segment colors — no more hardcoded bar/plumber/roofer
    const color = getSegmentColorClass(segment?.toLowerCase() || '');
    return <Badge className={color}>{segment || 'Unknown'}</Badge>;
  };

  // Derive unique segments from actual data for filter dropdowns
  const policySegments = Array.from(new Set(policies.map(p => p.segment).filter(Boolean))).sort();
  const claimSegments = Array.from(new Set(claims.map(c => c.segment).filter(Boolean) as string[])).sort();


  if (loading) {
    return (
      <div className="space-y-6">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <Card className="border-0 shadow-md">
          <CardContent className="p-8 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-[#F7941D]" />
            <span className="ml-2 text-gray-600">Loading admin dashboard...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="space-y-6">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <Card className="border-0 shadow-md">
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-gray-600">
              You don't have permission to access the admin dashboard.
              <br />
              This area is restricted to staff and admin users only.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="p-2 bg-[#1B3A5F] rounded-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
            <p className="text-sm text-gray-500">Manage policies, claims, and COI requests</p>
          </div>
        </div>
        <Button 
          onClick={fetchAllData} 
          variant="outline" 
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex overflow-x-auto">
          <TabsTrigger value="overview" className="flex items-center gap-1 text-xs sm:text-sm flex-1">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="policies" className="flex items-center gap-1 text-xs sm:text-sm flex-1">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Policies</span>
          </TabsTrigger>
          <TabsTrigger value="claims" className="flex items-center gap-1 text-xs sm:text-sm flex-1">
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden sm:inline">Claims</span>
          </TabsTrigger>
          <TabsTrigger value="coi" className="flex items-center gap-1 text-xs sm:text-sm flex-1">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">COI</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1 text-xs sm:text-sm flex-1">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-1 text-xs sm:text-sm flex-1">
            <ClipboardList className="w-4 h-4" />
            <span className="hidden sm:inline">Audit</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-1 text-xs sm:text-sm flex-1">
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-1 text-xs sm:text-sm flex-1">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="bulk-email" className="flex items-center gap-1 text-xs sm:text-sm flex-1">
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Bulk Email</span>
          </TabsTrigger>
          <TabsTrigger value="renewals" className="flex items-center gap-1 text-xs sm:text-sm flex-1">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Renewals</span>
          </TabsTrigger>
          <TabsTrigger value="claims-charts" className="flex items-center gap-1 text-xs sm:text-sm flex-1">
            <PieChart className="w-4 h-4" />
            <span className="hidden sm:inline">Charts</span>
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-1 text-xs sm:text-sm flex-1">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Webhooks</span>
          </TabsTrigger>
          <TabsTrigger value="webhook-rules" className="flex items-center gap-1 text-xs sm:text-sm flex-1">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Rules</span>
          </TabsTrigger>
        </TabsList>





        {/* Overview Tab — Real-time Dashboard with Alerts Banner */}
        <TabsContent value="overview" className="space-y-4">
          <AdminOverviewLive onNavigateTab={setActiveTab} />
        </TabsContent>





        {/* Policies Tab */}
        {/* Policies Tab */}
        <TabsContent value="policies" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search policies..."
                      value={policySearch}
                      onChange={(e) => setPolicySearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={policySegmentFilter} onValueChange={setPolicySegmentFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Segment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Segments</SelectItem>
                    {policySegments.map(seg => (
                      <SelectItem key={seg} value={seg}>{seg.charAt(0).toUpperCase() + seg.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={policyStatusFilter} onValueChange={setPolicyStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>


          <div className="space-y-2">
            {filteredPolicies.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No policies found</p>
                </CardContent>
              </Card>
            ) : (
              filteredPolicies.map((policy) => (
                <Card key={policy.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedPolicy(expandedPolicy === policy.id ? null : policy.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-semibold text-gray-800">{policy.policy_number}</p>
                          <p className="text-sm text-gray-500">{policy.business_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getSegmentBadge(policy.segment)}
                        {getStatusBadge(policy.status)}
                        {expandedPolicy === policy.id ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                    
                    {expandedPolicy === policy.id && (
                      <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Carrier</p>
                          <p className="font-medium">{policy.carrier}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Premium</p>
                          <p className="font-medium">${policy.premium?.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Effective</p>
                          <p className="font-medium">{policy.effective_date}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Expires</p>
                          <p className="font-medium">{policy.expiration_date}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">GL Limit</p>
                          <p className="font-medium">{policy.general_liability_limit || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Property Limit</p>
                          <p className="font-medium">{policy.property_limit || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Deductible</p>
                          <p className="font-medium">${policy.deductible?.toLocaleString() || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Created</p>
                          <p className="font-medium">{new Date(policy.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Claims Tab */}
        <TabsContent value="claims" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search claims..."
                      value={claimSearch}
                      onChange={(e) => setClaimSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={claimSegmentFilter} onValueChange={setClaimSegmentFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Segment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Segments</SelectItem>
                    <SelectItem value="bar">Bar</SelectItem>
                    <SelectItem value="plumber">Plumber</SelectItem>
                    <SelectItem value="roofer">Roofer</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={claimStatusFilter} onValueChange={setClaimStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="denied">Denied</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                {/* Download claims CSV */}
                <Button
                  onClick={handleDownloadClaimsCsv}
                  disabled={downloadingClaimsCsv}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {downloadingClaimsCsv ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span className="hidden sm:inline">Download claims report</span>
                </Button>
              </div>
              {/* Select All */}
              {filteredClaims.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAllClaims}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    {selectedClaimIds.size === filteredClaims.length && filteredClaims.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-[#F7941D]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    Select all ({filteredClaims.length})
                  </button>
                  {selectedClaimIds.size > 0 && (
                    <span className="text-xs text-gray-400 ml-2">{selectedClaimIds.size} selected</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-2">

            {filteredClaims.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center">
                  <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No claims found</p>
                </CardContent>
              </Card>
            ) : (
              filteredClaims.map((claim) => (
                <Card key={claim.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedClaim(expandedClaim === claim.id ? null : claim.id)}
                    >
                      <div className="flex items-center gap-3">
                        {/* Per-row checkbox */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleClaimSelection(claim.id);
                          }}
                          className="flex-shrink-0"
                        >
                          {selectedClaimIds.has(claim.id) ? (
                            <CheckSquare className="w-4 h-4 text-[#F7941D]" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                        <div>

                          <p className="font-semibold text-gray-800">{claim.claim_number || 'Pending'}</p>
                          <p className="text-sm text-gray-500 truncate max-w-[200px]">{claim.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getSegmentBadge(claim.segment || '')}
                        {getStatusBadge(claim.status)}
                        {expandedClaim === claim.id ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                    
                    {expandedClaim === claim.id && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                          <div>
                            <p className="text-gray-500">Type</p>
                            <p className="font-medium capitalize">{claim.claim_type?.replace('_', ' ') || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Incident Date</p>
                            <p className="font-medium">{claim.incident_date}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Location</p>
                            <p className="font-medium">{claim.incident_location}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Estimated Amount</p>
                            <p className="font-medium">
                              {claim.estimated_amount ? `$${claim.estimated_amount.toLocaleString()}` : 'N/A'}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-gray-500">Description</p>
                            <p className="font-medium">{claim.description}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Photos</p>
                            <p className="font-medium">{claim.photos?.length || 0} uploaded</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Backend Notified</p>
                            <p className="font-medium">{claim.backend_notified ? 'Yes' : 'No'}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 pt-3 border-t border-gray-100 flex-wrap">
                          <span className="text-sm text-gray-500">Update Status:</span>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClaimStatusUpdate(claim.id, 'under_review');
                            }}
                            className="text-purple-600 border-purple-200 hover:bg-purple-50"
                          >
                            Under Review
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClaimStatusUpdate(claim.id, 'approved');
                            }}
                            className="text-green-600 border-green-200 hover:bg-green-50"
                          >
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClaimStatusUpdate(claim.id, 'denied');
                            }}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            Deny
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClaimStatusUpdate(claim.id, 'closed');
                            }}
                            className="text-gray-600 border-gray-200 hover:bg-gray-50"
                          >
                            Close
                          </Button>
                        </div>

                        {/* Settlement Section */}
                        {(claim.status === 'approved' || claim.status === 'closed') && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                              <TrendingUp className="w-4 h-4" />
                              Settlement
                            </p>
                            {claim.settlement_amount != null ? (
                              <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                                <div>
                                  <p className="text-gray-500">Settlement Amount</p>
                                  <p className="font-semibold text-green-700">${Number(claim.settlement_amount).toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Settlement Date</p>
                                  <p className="font-medium">{claim.settlement_date || 'N/A'}</p>
                                </div>
                              </div>
                            ) : null}
                            {editingSettlement === claim.id ? (
                              <div className="flex items-end gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                                <div className="flex-1 min-w-[140px]">
                                  <label className="text-xs text-gray-500">Amount ($)</label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={settlementAmountInput}
                                    onChange={(e) => setSettlementAmountInput(e.target.value)}
                                    placeholder="0.00"
                                    className="text-sm"
                                  />
                                </div>
                                <div className="flex-1 min-w-[140px]">
                                  <label className="text-xs text-gray-500">Date</label>
                                  <Input
                                    type="date"
                                    value={settlementDateInput}
                                    onChange={(e) => setSettlementDateInput(e.target.value)}
                                    className="text-sm"
                                  />
                                </div>
                                <Button
                                  size="sm"
                                  disabled={savingSettlement}
                                  className="bg-[#F7941D] hover:bg-[#E07D0D]"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setSavingSettlement(true);
                                    const amt = settlementAmountInput ? parseFloat(settlementAmountInput) : null;
                                    const dt = settlementDateInput || null;
                                    const ok = await updateClaimSettlement(claim.id, amt, dt);
                                    setSavingSettlement(false);
                                    if (ok) {
                                      toast({ title: 'Settlement Saved', description: 'Settlement details updated' });
                                      auditLog('claim_settlement', 'claim', claim.id, {
                                        claim_number: claim.claim_number,
                                        settlement_amount: amt,
                                        settlement_date: dt
                                      });
                                      setEditingSettlement(null);
                                      await fetchAllData();
                                      void afterSettlementSaved(claim, amt, dt).catch((e) => console.warn("settlement notify", e));
                                    } else {
                                      toast({ title: 'Error', description: 'Failed to save settlement', variant: 'destructive' });
                                    }
                                  }}
                                >
                                  {savingSettlement ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingSettlement(null); }}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingSettlement(claim.id);
                                  setSettlementAmountInput(claim.settlement_amount?.toString() || '');
                                  setSettlementDateInput(claim.settlement_date || '');
                                }}
                                className="text-[#F7941D] border-[#F7941D]/30 hover:bg-[#F7941D]/5"
                              >
                                <Edit2 className="w-3 h-3 mr-1" />
                                {claim.settlement_amount != null ? 'Edit Settlement' : 'Set Settlement'}
                              </Button>
                            )}
                          </div>
                        )}

                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Bulk Claims Floating Bar */}
          {selectedClaimIds.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1B3A5F] text-white rounded-xl shadow-2xl px-5 py-3 flex items-center gap-4 flex-wrap">
              {bulkUpdating ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">Updating claims...</span>
                </div>
              ) : (
                <>
                  <span className="text-sm font-medium">{selectedClaimIds.size} selected</span>
                  <Button
                    size="sm"
                    onClick={() => handleBulkStatusUpdate('approved')}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Approve selected
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleBulkStatusUpdate('closed')}
                    className="bg-gray-500 hover:bg-gray-600 text-white text-xs"
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    Close selected
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedClaimIds(new Set())}
                    className="text-white hover:bg-white/20 text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Clear
                  </Button>
                </>
              )}
            </div>
          )}
        </TabsContent>


        {/* COI Requests Tab */}
        <TabsContent value="coi" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search COI requests..."
                      value={coiSearch}
                      onChange={(e) => setCoiSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={coiStatusFilter} onValueChange={setCoiStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Select All COIs */}
              {filteredCoiRequests.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAllCois}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    {selectedCoiIds.size === filteredCoiRequests.length && filteredCoiRequests.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-[#F7941D]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    Select all ({filteredCoiRequests.length})
                  </button>
                  {selectedCoiIds.size > 0 && (
                    <span className="text-xs text-gray-400 ml-2">{selectedCoiIds.size} selected</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-2">
            {filteredCoiRequests.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No COI requests found</p>
                </CardContent>
              </Card>
            ) : (
              filteredCoiRequests.map((req) => (
                <Card key={req.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedCoi(expandedCoi === req.id ? null : req.id)}
                    >
                      <div className="flex items-center gap-3">
                        {/* Per-row COI checkbox */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCoiSelection(req.id);
                          }}
                          className="flex-shrink-0"
                        >
                          {selectedCoiIds.has(req.id) ? (
                            <CheckSquare className="w-4 h-4 text-[#F7941D]" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                        <div>
                          <p className="font-semibold text-gray-800 font-mono text-sm">{req.request_number}</p>
                          <p className="text-sm text-gray-500">{req.certificate_holder_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(req.status)}
                        <span className="text-xs text-gray-400">
                          {new Date(req.created_at).toLocaleDateString()}
                        </span>
                        {expandedCoi === req.id ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                    
                    {expandedCoi === req.id && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                          <div>
                            <p className="text-gray-500">User ID</p>
                            <p className="font-medium text-xs font-mono truncate">{req.user_id}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Holder Name</p>
                            <p className="font-medium">{req.certificate_holder_name}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Delivery Email</p>
                            <p className="font-medium">{req.delivery_email}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Certificate Type</p>
                            <p className="font-medium capitalize">{req.certificate_type?.replace(/_/g, ' ') || 'Standard'}</p>
                          </div>
                          {req.certificate_holder_address && (
                            <div className="col-span-2">
                              <p className="text-gray-500">Address</p>
                              <p className="font-medium">
                                {[req.certificate_holder_address, req.certificate_holder_city, req.certificate_holder_state, req.certificate_holder_zip].filter(Boolean).join(', ')}
                              </p>
                            </div>
                          )}
                          {req.additional_instructions && (
                            <div className="col-span-2">
                              <p className="text-gray-500">Instructions</p>
                              <p className="font-medium">{req.additional_instructions}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-gray-500">Segment</p>
                            <p className="font-medium capitalize">{req.segment || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Backend Notified</p>
                            <p className="font-medium">{req.backend_notified ? 'Yes' : 'No'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Uploaded File</p>
                            <p className="font-medium">{req.uploaded_file_name || 'None'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Submitted</p>
                            <p className="font-medium">{new Date(req.created_at).toLocaleString()}</p>
                          </div>
                        </div>

                        {/* Generated PDF URL */}
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <LinkIcon className="w-4 h-4" />
                              Generated PDF URL
                            </p>
                            {editingPdfUrl !== req.id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingPdfUrl(req.id);
                                  setPdfUrlInput(req.generated_pdf_url || '');
                                }}
                                className="text-xs"
                              >
                                <Edit2 className="w-3 h-3 mr-1" />
                                {req.generated_pdf_url ? 'Edit' : 'Set URL'}
                              </Button>
                            )}
                          </div>
                          
                          {editingPdfUrl === req.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={pdfUrlInput}
                                onChange={(e) => setPdfUrlInput(e.target.value)}
                                placeholder="https://example.com/cert.pdf"
                                className="flex-1 text-sm"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSavePdfUrl(req.id);
                                }}
                                disabled={savingPdfUrl}
                                className="bg-[#F7941D] hover:bg-[#E07D0D]"
                              >
                                {savingPdfUrl ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Save className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingPdfUrl(null);
                                  setPdfUrlInput('');
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600">
                              {req.generated_pdf_url ? (
                                <a 
                                  href={req.generated_pdf_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline break-all"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {req.generated_pdf_url}
                                </a>
                              ) : (
                                <span className="text-gray-400 italic">Not set</span>
                              )}
                            </p>
                          )}
                        </div>
                        
                        {/* Status Update Actions */}
                        <div className="flex items-center gap-2 pt-3 border-t border-gray-100 flex-wrap">
                          <span className="text-sm text-gray-500">Update Status:</span>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCoiStatusUpdate(req.id, 'processing');
                            }}
                            className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                          >
                            Processing
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCoiStatusUpdate(req.id, 'completed');
                            }}
                            className="text-green-600 border-green-200 hover:bg-green-50"
                          >
                            Completed
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCoiStatusUpdate(req.id, 'failed');
                            }}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            Failed
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Bulk COI Floating Bar */}
          {selectedCoiIds.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1B3A5F] text-white rounded-xl shadow-2xl px-5 py-3 flex items-center gap-4 flex-wrap">
              {bulkCoiUpdating ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">Updating COI requests...</span>
                </div>
              ) : (
                <>
                  <span className="text-sm font-medium">{selectedCoiIds.size} selected</span>
                  <Button
                    size="sm"
                    onClick={() => handleBulkCoiStatusUpdate('processing')}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs"
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    Mark processing
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleBulkCoiStatusUpdate('completed')}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Mark completed
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleBulkCoiStatusUpdate('failed')}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs"
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    Mark failed
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedCoiIds(new Set())}
                    className="text-white hover:bg-white/20 text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Clear
                  </Button>
                </>
              )}
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <AnalyticsTab />
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="space-y-4">
          <AuditLogTab />
        </TabsContent>

        {/* Email Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <EmailTemplatesTab />
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <AdminUsersTab />
        </TabsContent>

        {/* Bulk Quote Email Tab */}
        <TabsContent value="bulk-email" className="space-y-4">
          <AdminBulkQuoteEmail />
        </TabsContent>

        {/* Renewal Alerts Tab */}
        <TabsContent value="renewals" className="space-y-4">
          <AdminRenewalAlerts />
        </TabsContent>

        {/* Claims Charts Tab */}
        <TabsContent value="claims-charts" className="space-y-4">
          <AdminClaimsCharts />
          <AdminClaimAssignments />
        </TabsContent>

        {/* Webhook Log Tab */}
        <TabsContent value="webhooks" className="space-y-4">
          <WebhookLogTab />
        </TabsContent>

        {/* Webhook Rules Tab */}
        <TabsContent value="webhook-rules" className="space-y-4">
          <WebhookRulesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
