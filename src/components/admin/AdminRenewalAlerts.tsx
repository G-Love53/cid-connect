import React, { useState, useEffect } from 'react';
import {
  Bell, Calendar, Loader2, RefreshCw, CheckCircle, XCircle, Clock,
  AlertTriangle, Send, Filter, Shield, Building2, Power, Database,
  ChevronDown, ChevronUp, Copy, ExternalLink, Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { Policy } from '@/types';
import {
  getUpcomingRenewals,
  getRenewalNotifications,
  triggerRenewalCheck,
  getAppSetting,
  setAppSetting,
  formatRelativeTime,
  getCronScheduleStatus,
  markCronScheduleConfigured,
  type RenewalNotification,
  type CronScheduleStatus
} from '@/api';

const AdminRenewalAlerts: React.FC = () => {
  const [renewals, setRenewals] = useState<Policy[]>([]);
  const [notifications, setNotifications] = useState<RenewalNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [notifStatusFilter, setNotifStatusFilter] = useState('all');
  const [subTab, setSubTab] = useState('upcoming');

  // Cron settings
  const [cronEnabled, setCronEnabled] = useState(true);
  const [cronToggling, setCronToggling] = useState(false);
  const [lastCronRun, setLastCronRun] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    fetchData();
    fetchSettings();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [renewalData, notifData] = await Promise.all([
      getUpcomingRenewals(90),
      getRenewalNotifications({ limit: 100 })
    ]);
    setRenewals(renewalData);
    setNotifications(notifData);
    setLoading(false);
  };

  const fetchSettings = async () => {
    setSettingsLoading(true);
    const [enabledVal, lastRunVal] = await Promise.all([
      getAppSetting('renewal_cron_enabled'),
      getAppSetting('renewal_last_cron_at')
    ]);
    setCronEnabled(enabledVal !== 'false'); // default to true
    setLastCronRun(lastRunVal && lastRunVal.length > 0 ? lastRunVal : null);
    setSettingsLoading(false);
  };

  const handleToggleCron = async (checked: boolean) => {
    setCronToggling(true);
    const ok = await setAppSetting('renewal_cron_enabled', checked ? 'true' : 'false');
    setCronToggling(false);
    if (ok) {
      setCronEnabled(checked);
      toast({
        title: checked ? 'Cron Enabled' : 'Cron Disabled',
        description: checked
          ? 'Automatic renewal checks will run daily at 08:00 UTC.'
          : 'Automatic renewal checks are paused. You can still run manually.'
      });
    } else {
      toast({ title: 'Error', description: 'Failed to update setting', variant: 'destructive' });
    }
  };

  const handleTriggerCheck = async () => {
    setTriggering(true);
    const result = await triggerRenewalCheck();
    setTriggering(false);

    if (result.success) {
      toast({
        title: 'Renewal Check Complete',
        description: `Processed ${result.processed || 0} policy/notification(s)`
      });
      fetchData();
      fetchSettings(); // refresh last run
    } else {
      toast({
        title: 'Renewal Check Failed',
        description: result.error || 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  const getDaysUntilExpiry = (expirationDate: string) => {
    const today = new Date();
    const exp = new Date(expirationDate);
    return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getUrgencyBadge = (days: number) => {
    if (days <= 30) return <Badge className="bg-red-100 text-red-800">{days}d left</Badge>;
    if (days <= 60) return <Badge className="bg-orange-100 text-orange-800">{days}d left</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-800">{days}d left</Badge>;
  };

  const filteredNotifications = notifications.filter(n => {
    if (notifStatusFilter === 'all') return true;
    return n.status === notifStatusFilter;
  });

  if (loading && settingsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  const within30 = renewals.filter(p => getDaysUntilExpiry(p.expiration_date) <= 30).length;
  const within60 = renewals.filter(p => {
    const d = getDaysUntilExpiry(p.expiration_date);
    return d > 30 && d <= 60;
  }).length;
  const within90 = renewals.filter(p => {
    const d = getDaysUntilExpiry(p.expiration_date);
    return d > 60 && d <= 90;
  }).length;

  return (
    <div className="space-y-4">
      {/* Header with trigger button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#F7941D]" />
          <h3 className="font-semibold text-gray-800">Renewal Alerts</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            onClick={handleTriggerCheck}
            disabled={triggering}
            size="sm"
            className="bg-[#F7941D] hover:bg-[#E07D0D] text-white"
          >
            {triggering ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
            Run Renewal Check
          </Button>
        </div>
      </div>

      {/* Cron Schedule Card */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${cronEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Power className={`w-5 h-5 ${cronEnabled ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Automatic Renewal Checks</p>
                <p className="text-xs text-gray-500">
                  Next scheduled run: <span className="font-medium text-gray-700">daily 08:00 UTC</span>
                </p>
                {lastCronRun && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Last run: <span className="font-medium">{new Date(lastCronRun).toLocaleString()}</span>
                    {' '}({formatRelativeTime(lastCronRun)})
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">{cronEnabled ? 'Enabled' : 'Disabled'}</span>
              <Switch
                checked={cronEnabled}
                onCheckedChange={handleToggleCron}
                disabled={cronToggling || settingsLoading}
              />
            </div>
          </div>
          {!cronEnabled && (
            <p className="text-xs text-amber-600 mt-2 pl-12">
              Automatic runs are paused. Renewal emails will only be sent when you click "Run Renewal Check" above.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">{within30}</p>
              <p className="text-xs text-red-600">Within 30 days</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-orange-50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-700">{within60}</p>
              <p className="text-xs text-orange-600">31-60 days</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-yellow-50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Calendar className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-700">{within90}</p>
              <p className="text-xs text-yellow-600">61-90 days</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sub-tabs */}
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="upcoming" className="text-xs">
            Upcoming Renewals ({renewals.length})
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs">
            Sent Notifications ({notifications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-2 mt-3">
          {renewals.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8 text-center">
                <Shield className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No policies expiring in the next 90 days</p>
              </CardContent>
            </Card>
          ) : (
            renewals.map(policy => {
              const daysLeft = getDaysUntilExpiry(policy.expiration_date);
              return (
                <Card key={policy.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <Building2 className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{policy.policy_number}</p>
                          <p className="text-xs text-gray-500">{policy.business_name} &middot; {policy.segment}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Expires</p>
                          <p className="text-sm font-medium text-gray-700">{policy.expiration_date}</p>
                        </div>
                        {getUrgencyBadge(daysLeft)}
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-gray-500">
                      <div>Carrier: <span className="text-gray-700 font-medium">{policy.carrier}</span></div>
                      <div>Premium: <span className="text-gray-700 font-medium">${policy.premium?.toLocaleString()}</span></div>
                      <div>Status: <Badge className="bg-green-100 text-green-800 text-[10px]">{policy.status}</Badge></div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="notifications" className="space-y-3 mt-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <Select value={notifStatusFilter} onValueChange={setNotifStatusFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredNotifications.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8 text-center">
                <Bell className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No notifications found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map(n => (
                <Card key={n.id} className="border-0 shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {n.status === 'sent' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : n.status === 'failed' ? (
                          <XCircle className="w-4 h-4 text-red-500" />
                        ) : (
                          <Clock className="w-4 h-4 text-yellow-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {n.days_before_expiry}-day reminder
                          </p>
                          <p className="text-xs text-gray-500 font-mono">
                            Policy: {n.policy_id.substring(0, 8)}...
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={
                          n.status === 'sent' ? 'bg-green-100 text-green-800' :
                          n.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {n.status}
                        </Badge>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {formatRelativeTime(n.created_at)}
                        </p>
                      </div>
                    </div>
                    {n.error_message && (
                      <p className="text-xs text-red-500 mt-1 pl-6">{n.error_message}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Cron Setup Status & Guide */}
      <CronSetupPanel />

      {/* Cron documentation note */}
      <div className="text-xs text-gray-400 text-center pt-2 space-y-1">
        <p>
          The <code className="bg-gray-100 px-1 rounded">check-renewals</code> edge function is scheduled
          via <strong>pg_cron + pg_net</strong> (or Supabase Dashboard cron) daily at 08:00 UTC.
        </p>
        <p>
          When disabled above, the function exits early without sending emails.
          Setting stored in <code className="bg-gray-100 px-1 rounded">app_settings</code> table.
        </p>
      </div>
    </div>
  );
};

/** Collapsible panel showing cron setup status and SQL setup guide */
const CronSetupPanel: React.FC = () => {
  const [status, setStatus] = useState<CronScheduleStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    const s = await getCronScheduleStatus();
    setStatus(s);
    setLoading(false);
  };

  const handleMarkConfigured = async (approach: string) => {
    setMarking(true);
    const ok = await markCronScheduleConfigured(approach);
    setMarking(false);
    if (ok) {
      toast({ title: 'Cron Marked as Configured', description: `Approach: ${approach}` });
      loadStatus();
    } else {
      toast({ title: 'Error', description: 'Failed to save cron status', variant: 'destructive' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: 'Copied to clipboard', description: 'SQL copied. Paste into Supabase SQL Editor.' });
    }).catch(() => {
      toast({ title: 'Copy failed', description: 'Please select and copy manually.', variant: 'destructive' });
    });
  };

  if (loading) return null;

  const cronSQL = `-- Run in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Store service role key in Vault first:
-- SELECT vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key', 'For pg_cron edge function calls');

SELECT cron.schedule(
  'daily-renewal-check',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://zyaqtsmeeygcyqrvpyuy.supabase.co/functions/v1/check-renewals',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
      'Content-Type',  'application/json'
    ),
    body    := '{}'::jsonb
  );
  $$
);`;

  return (
    <Card className={`border shadow-sm ${status?.isConfigured ? 'border-green-200 bg-green-50/30' : 'border-amber-200 bg-amber-50/30'}`}>
      <CardContent className="p-0">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-white/30 transition-colors rounded-lg"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${status?.isConfigured ? 'bg-green-100' : 'bg-amber-100'}`}>
              <Database className={`w-4 h-4 ${status?.isConfigured ? 'text-green-600' : 'text-amber-600'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-800">pg_cron Schedule</p>
                {status?.isConfigured ? (
                  <Badge className="bg-green-100 text-green-700 text-[10px]">Configured</Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700 text-[10px]">Setup Required</Badge>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {status?.isConfigured
                  ? `Set up ${status.configuredAt ? formatRelativeTime(status.configuredAt) : 'previously'}`
                  : 'Run the migration SQL to activate automatic daily checks'}
              </p>
            </div>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-4">
            {/* Status details */}
            {status?.isConfigured && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-white rounded-lg p-3 border border-gray-100">
                  <p className="text-gray-500">Approach</p>
                  <p className="font-medium text-gray-800 mt-0.5">{status.approach || 'Not recorded'}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-100">
                  <p className="text-gray-500">Configured At</p>
                  <p className="font-medium text-gray-800 mt-0.5">
                    {status.configuredAt ? new Date(status.configuredAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-100">
                  <p className="text-gray-500">Last Cron Run</p>
                  <p className="font-medium text-gray-800 mt-0.5">
                    {status.lastRunAt ? `${new Date(status.lastRunAt).toLocaleString()} (${formatRelativeTime(status.lastRunAt)})` : 'Never'}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-100">
                  <p className="text-gray-500">Cron Enabled</p>
                  <p className={`font-medium mt-0.5 ${status.cronEnabled ? 'text-green-700' : 'text-amber-700'}`}>
                    {status.cronEnabled ? 'Yes' : 'No (paused)'}
                  </p>
                </div>
              </div>
            )}

            {/* Setup instructions */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-500" />
                <p className="text-sm font-medium text-gray-700">Setup Instructions</p>
              </div>

              <div className="text-xs text-gray-600 space-y-2">
                <p className="font-medium text-gray-700">Option A: pg_cron + pg_net (recommended)</p>
                <ol className="list-decimal list-inside space-y-1 pl-2">
                  <li>Open <strong>Supabase Dashboard</strong> &rarr; <strong>SQL Editor</strong></li>
                  <li>Store your service role key in Vault (see SQL below)</li>
                  <li>Run the <code className="bg-gray-100 px-1 rounded">cron.schedule</code> SQL below</li>
                  <li>Click "Mark as Configured" when done</li>
                </ol>

                <p className="font-medium text-gray-700 pt-2">Option B: Dashboard Edge Function Schedules</p>
                <ol className="list-decimal list-inside space-y-1 pl-2">
                  <li>Go to <strong>Edge Functions</strong> &rarr; <strong>check-renewals</strong> &rarr; <strong>Schedules</strong></li>
                  <li>Add schedule: <code className="bg-gray-100 px-1 rounded">0 8 * * *</code></li>
                  <li>Click "Mark as Configured" when done</li>
                </ol>
              </div>

              {/* SQL block */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-gray-500">pg_cron SQL (copy to SQL Editor)</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(cronSQL)}
                    className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <pre className="bg-gray-900 text-green-400 text-[11px] p-3 rounded-lg overflow-x-auto max-h-48 leading-relaxed">
                  {cronSQL}
                </pre>
              </div>

              {/* Migration file reference */}
              <p className="text-[11px] text-gray-400">
                Full migration with Vault setup, verification queries, and troubleshooting:
                <code className="bg-gray-100 px-1 rounded ml-1">reference/migrations/001_setup_pg_cron_renewal_check.sql</code>
              </p>

              {/* Mark as configured buttons */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  size="sm"
                  disabled={marking}
                  onClick={() => handleMarkConfigured('pg_cron + pg_net → POST check-renewals at 08:00 UTC daily')}
                  className="bg-[#1B3A5F] hover:bg-[#152E4D] text-white text-xs"
                >
                  {marking ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                  Mark as Configured (pg_cron)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={marking}
                  onClick={() => handleMarkConfigured('Supabase Dashboard Edge Function Schedule → 0 8 * * * (08:00 UTC daily)')}
                  className="text-xs"
                >
                  {marking ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ExternalLink className="w-3 h-3 mr-1" />}
                  Mark as Configured (Dashboard)
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminRenewalAlerts;
