import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertTriangle, FileText, CheckCircle, Mail, Shield, RefreshCw,
  Activity, Clock, Zap, TrendingUp, Download, Loader2, Layers
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import {
  getOverviewTodayCounts, getOverviewSparklineData, getAdminActivityFeed,
  getAllPolicies, getAllClaims, downloadAdminOverviewPdf, formatRelativeTime,
  type OverviewTodayCounts, type OverviewSparklines, type AdminFeedItem, type SparklineDay
} from '@/api';
import AdminAlertsBanner from './AdminAlertsBanner';

// Segment color palette
const SEGMENT_COLORS: Record<string, string> = {
  bar: 'bg-purple-100 text-purple-800',
  plumber: 'bg-blue-100 text-blue-800',
  roofer: 'bg-orange-100 text-orange-800',
  electrician: 'bg-yellow-100 text-yellow-800',
  hvac: 'bg-cyan-100 text-cyan-800',
  restaurant: 'bg-red-100 text-red-800',
  autoshop: 'bg-emerald-100 text-emerald-800',
  landscaper: 'bg-lime-100 text-lime-800',
  unspecified: 'bg-gray-100 text-gray-600',
};

const getSegmentColor = (seg: string) => SEGMENT_COLORS[seg] || 'bg-gray-100 text-gray-700';

// Sparkline component
const Sparkline: React.FC<{ data: SparklineDay[]; color?: string; width?: number; height?: number }> = ({
  data, color = '#F7941D', width = 80, height = 24
}) => {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => d.count), 1);
  const p = 2; const iW = width - p * 2; const iH = height - p * 2;
  const pts = data.map((d, i) => `${p + (i / (data.length - 1)) * iW},${p + iH - (d.count / maxVal) * iH}`);
  const area = `M ${p},${p + iH} L ${pts.join(' L ')} L ${p + iW},${p + iH} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="inline-block">
      <path d={area} fill={color} fillOpacity="0.1" />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.length > 0 && <circle cx={p + iW} cy={p + iH - (data[data.length - 1].count / maxVal) * iH} r="2" fill={color} />}
    </svg>
  );
};

const feedTypeConfig: Record<string, { color: string; icon: React.ReactNode; bgColor: string }> = {
  claim: { color: 'text-orange-700', bgColor: 'bg-orange-100', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  coi: { color: 'text-blue-700', bgColor: 'bg-blue-100', icon: <FileText className="w-3.5 h-3.5" /> },
  policy: { color: 'text-green-700', bgColor: 'bg-green-100', icon: <Shield className="w-3.5 h-3.5" /> },
  audit: { color: 'text-purple-700', bgColor: 'bg-purple-100', icon: <Activity className="w-3.5 h-3.5" /> }
};

const TodayCardSkeleton = () => (
  <Card className="border-0 shadow-sm"><CardContent className="p-5"><div className="flex items-center gap-3"><Skeleton className="w-10 h-10 rounded-lg" /><div className="flex-1"><Skeleton className="h-7 w-12 mb-1" /><Skeleton className="h-3 w-24" /></div><Skeleton className="w-20 h-6" /></div></CardContent></Card>
);

const FeedSkeleton = () => (
  <div className="space-y-3">{[1,2,3,4,5].map(i => (<div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50/50"><Skeleton className="w-7 h-7 rounded-full" /><div className="flex-1"><Skeleton className="h-4 w-40 mb-1" /><Skeleton className="h-3 w-24" /></div><Skeleton className="h-3 w-16" /></div>))}</div>
);

interface AdminOverviewLiveProps {
  onNavigateTab?: (tab: string) => void;
}

const AdminOverviewLive: React.FC<AdminOverviewLiveProps> = ({ onNavigateTab }) => {

  const [todayCounts, setTodayCounts] = useState<OverviewTodayCounts | null>(null);
  const [sparklines, setSparklines] = useState<OverviewSparklines | null>(null);
  const [feed, setFeed] = useState<AdminFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const channelRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Segment breakdown
  const [segPolicies, setSegPolicies] = useState<Record<string, number>>({});
  const [segClaims, setSegClaims] = useState<Record<string, number>>({});
  const [segLoading, setSegLoading] = useState(true);

  // PDF export
  const [exportingPdf, setExportingPdf] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [counts, sparkData, feedData] = await Promise.all([
        getOverviewTodayCounts(), getOverviewSparklineData(), getAdminActivityFeed(20)
      ]);
      setTodayCounts(counts); setSparklines(sparkData); setFeed(feedData); setLastRefresh(new Date());
    } catch (err) { console.error('Error fetching overview data:', err); }
    finally { setLoading(false); }
  }, []);

  // Fetch segment breakdown data
  const fetchSegments = useCallback(async () => {
    setSegLoading(true);
    try {
      const [policies, claims] = await Promise.all([getAllPolicies(), getAllClaims()]);
      const pMap: Record<string, number> = {};
      const cMap: Record<string, number> = {};
      policies.forEach(p => { const s = (p.segment || 'unspecified').toLowerCase(); pMap[s] = (pMap[s] || 0) + 1; });
      claims.forEach(c => { const s = (c.segment || 'unspecified').toLowerCase(); cMap[s] = (cMap[s] || 0) + 1; });
      setSegPolicies(pMap); setSegClaims(cMap);
    } catch (err) { console.error('Error fetching segment data:', err); }
    finally { setSegLoading(false); }
  }, []);

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const ok = await downloadAdminOverviewPdf();
      if (ok) { toast({ title: 'PDF Downloaded', description: 'Dashboard report PDF has been downloaded.' }); }
      else { toast({ title: 'Export Failed', description: 'Could not generate the PDF report.', variant: 'destructive' }); }
    } catch (err: any) {
      toast({ title: 'Export Error', description: err.message || 'Unexpected error', variant: 'destructive' });
    } finally { setExportingPdf(false); }
  };

  useEffect(() => {
    fetchAll(); fetchSegments();
    const channel = supabase.channel('admin-overview-realtime')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'claims' }, () => { fetchAll(); fetchSegments(); })
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'coi_requests' }, () => fetchAll())
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'policies' }, () => { fetchAll(); fetchSegments(); })
      .subscribe();
    channelRef.current = channel;
    intervalRef.current = setInterval(() => { fetchAll(); }, 60_000);
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchAll, fetchSegments]);

  const todayStats = todayCounts ? [
    { label: 'Claims Filed', value: todayCounts.claimsFiledToday, icon: <AlertTriangle className="w-5 h-5 text-orange-600" />, bgColor: 'bg-orange-100', sparkData: sparklines?.claims },
    { label: 'COIs Completed', value: todayCounts.coisCompletedToday, icon: <CheckCircle className="w-5 h-5 text-green-600" />, bgColor: 'bg-green-100', sparkData: sparklines?.cois },
    { label: 'Policies Bound', value: todayCounts.policiesBoundToday, icon: <Shield className="w-5 h-5 text-blue-600" />, bgColor: 'bg-blue-100', sparkData: sparklines?.policies },
    { label: 'Emails Sent', value: todayCounts.emailsSentToday, icon: <Mail className="w-5 h-5 text-purple-600" />, bgColor: 'bg-purple-100', sparkData: null }
  ] : [];

  const sparkTotal = (data: SparklineDay[] | null | undefined) => data ? data.reduce((s, d) => s + d.count, 0) : 0;

  return (
    <div className="space-y-6">
      {/* Admin Alerts Banner */}
      <AdminAlertsBanner onNavigateTab={onNavigateTab || (() => {})} />

      {/* Live indicator + Export PDF */}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <span className="absolute inline-flex h-2.5 w-2.5 rounded-full bg-green-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
          </div>
          <span className="text-sm font-medium text-gray-600">Live Dashboard</span>
          <span className="text-xs text-gray-400">Updated {lastRefresh.toLocaleTimeString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleExportPdf} disabled={exportingPdf} variant="outline" size="sm" className="flex items-center gap-1.5 text-xs">
            {exportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Export PDF
          </Button>
          <button onClick={fetchAll} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Today's Summary */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Zap className="w-4 h-4" /> Today's Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? <><TodayCardSkeleton /><TodayCardSkeleton /><TodayCardSkeleton /><TodayCardSkeleton /></> : todayStats.map((stat, idx) => (
            <Card key={idx} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>{stat.icon}</div>
                    <div><p className="text-2xl font-bold text-gray-800">{stat.value}</p><p className="text-xs text-gray-500">{stat.label}</p></div>
                  </div>
                  {stat.sparkData && (
                    <div className="flex flex-col items-end">
                      <Sparkline data={stat.sparkData} color={idx === 0 ? '#F97316' : idx === 1 ? '#22C55E' : '#3B82F6'} width={80} height={28} />
                      <span className="text-[10px] text-gray-400 mt-0.5">{sparkTotal(stat.sparkData)} / 7d</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 7-Day Trends */}
      {!loading && sparklines && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> 7-Day Trends</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: 'Claims', data: sparklines.claims, color: '#F97316', bgColor: 'bg-orange-50' },
              { title: 'COI Completions', data: sparklines.cois, color: '#22C55E', bgColor: 'bg-green-50' },
              { title: 'Policies Bound', data: sparklines.policies, color: '#3B82F6', bgColor: 'bg-blue-50' }
            ].map((trend, idx) => (
              <Card key={idx} className={`border-0 shadow-sm ${trend.bgColor}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-700">{trend.title}</p>
                    <span className="text-lg font-bold" style={{ color: trend.color }}>{sparkTotal(trend.data)}</span>
                  </div>
                  <div className="flex items-end justify-between gap-1">
                    {trend.data.map((day, i) => {
                      const maxVal = Math.max(...trend.data.map(d => d.count), 1);
                      const hPct = (day.count / maxVal) * 100;
                      return (
                        <div key={i} className="flex flex-col items-center flex-1">
                          <div className="w-full flex justify-center mb-1" style={{ height: '40px' }}>
                            <div className="rounded-t-sm transition-all duration-300" style={{ width: '100%', maxWidth: '16px', height: `${Math.max(hPct, 4)}%`, backgroundColor: day.count > 0 ? trend.color : '#E5E7EB', alignSelf: 'flex-end', opacity: day.count > 0 ? 1 : 0.4 }} />
                          </div>
                          <span className="text-[9px] text-gray-400 leading-none">{day.label}</span>
                          {day.count > 0 && <span className="text-[9px] font-medium text-gray-600 leading-none mt-0.5">{day.count}</span>}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Segment Breakdown */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4" /> Segment Breakdown
        </h3>
        {segLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm"><CardContent className="p-4"><Skeleton className="h-6 w-32 mb-3" /><div className="flex flex-wrap gap-2"><Skeleton className="h-7 w-24" /><Skeleton className="h-7 w-20" /><Skeleton className="h-7 w-28" /></div></CardContent></Card>
            <Card className="border-0 shadow-sm"><CardContent className="p-4"><Skeleton className="h-6 w-32 mb-3" /><div className="flex flex-wrap gap-2"><Skeleton className="h-7 w-24" /><Skeleton className="h-7 w-20" /><Skeleton className="h-7 w-28" /></div></CardContent></Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Policies by segment */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-medium text-gray-700">Policies by Segment</p>
                  <span className="text-xs text-gray-400 ml-auto">{Object.values(segPolicies).reduce((a, b) => a + b, 0)} total</span>
                </div>
                {Object.keys(segPolicies).length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No policies found</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(segPolicies)
                      .sort((a, b) => b[1] - a[1])
                      .map(([seg, count]) => (
                        <Badge key={seg} className={`${getSegmentColor(seg)} text-xs px-2.5 py-1 font-medium`}>
                          {seg.charAt(0).toUpperCase() + seg.slice(1)}: {count}
                        </Badge>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Claims by segment */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <p className="text-sm font-medium text-gray-700">Claims by Segment</p>
                  <span className="text-xs text-gray-400 ml-auto">{Object.values(segClaims).reduce((a, b) => a + b, 0)} total</span>
                </div>
                {Object.keys(segClaims).length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No claims found</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(segClaims)
                      .sort((a, b) => b[1] - a[1])
                      .map(([seg, count]) => (
                        <Badge key={seg} className={`${getSegmentColor(seg)} text-xs px-2.5 py-1 font-medium`}>
                          {seg.charAt(0).toUpperCase() + seg.slice(1)}: {count}
                        </Badge>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Live Activity Feed */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Activity className="w-4 h-4" /> Live Activity Feed</h3>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            {loading ? <FeedSkeleton /> : feed.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No recent activity</p>
                <p className="text-gray-400 text-xs mt-1">Activity from claims, COI requests, and policies will appear here</p>
              </div>
            ) : (
              <div className="space-y-1">
                {feed.map((item) => {
                  const config = feedTypeConfig[item.type] || feedTypeConfig.audit;
                  return (
                    <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${config.bgColor} ${config.color}`}>{config.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800 truncate">{item.label}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-gray-500 border-gray-200 flex-shrink-0">{item.type}</Badge>
                        </div>
                        {item.reference && <p className="text-xs text-gray-500 truncate font-mono">{item.reference}</p>}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">{formatRelativeTime(item.timestamp)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Realtime info note */}
      <div className="text-xs text-gray-400 text-center pb-2">
        <p>Realtime subscriptions active for <code className="bg-gray-100 px-1 rounded">claims</code>, <code className="bg-gray-100 px-1 rounded">coi_requests</code>, <code className="bg-gray-100 px-1 rounded">policies</code>. Backup polling every 60s.</p>
      </div>
    </div>
  );
};

export default AdminOverviewLive;
