import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  FileText,
  Shield,
  Loader2,
  RefreshCw,
  BarChart3,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getAnalyticsData, downloadSettlementReportCsv, AnalyticsData, WeeklyDataPoint, MonthlyDataPoint } from '@/api';
import { toast } from '@/components/ui/use-toast';

const AnalyticsTab: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingCsv, setDownloadingCsv] = useState(false);


  const handleDownloadSettlementCsv = async () => {
    setDownloadingCsv(true);
    try {
      await downloadSettlementReportCsv();
      toast({ title: 'Download Started', description: 'Settlement report CSV is downloading.' });
    } catch (err: any) {
      console.error('CSV download error:', err);
      toast({ title: 'Download Failed', description: err.message || 'Could not generate settlement report.', variant: 'destructive' });
    } finally {
      setDownloadingCsv(false);
    }
  };


  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAnalyticsData();
      setData(result);
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#F7941D]" />
          <span className="ml-2 text-gray-600">Loading analytics...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8 text-center">
          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{error || 'No data available'}</p>
          <Button onClick={fetchData} variant="outline" size="sm" className="mt-3">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (val: number) => {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
    return `$${val.toLocaleString()}`;
  };

  return (

    <div className="space-y-6">
      {/* Top bar: Refresh + Download Settlement CSV */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button
          onClick={handleDownloadSettlementCsv}
          disabled={downloadingCsv}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          {downloadingCsv ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Download settlement report
        </Button>
        <Button onClick={fetchData} variant="outline" size="sm" className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>


      {/* Summary Cards */}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <SummaryCard
          icon={<DollarSign className="w-5 h-5 text-green-600" />}
          iconBg="bg-green-100"
          label="Total Premium Volume"
          value={formatCurrency(data.totalPremiumVolume)}
        />
        <SummaryCard
          icon={<AlertTriangle className="w-5 h-5 text-orange-600" />}
          iconBg="bg-orange-100"
          label="Avg Claim Amount"
          value={data.averageClaimAmount != null ? formatCurrency(data.averageClaimAmount) : 'N/A'}
        />
        <SummaryCard
          icon={<FileText className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-100"
          label="Claims with Amounts"
          value={data.totalClaimsWithAmount.toString()}
        />
        <SummaryCard
          icon={<DollarSign className="w-5 h-5 text-purple-600" />}
          iconBg="bg-purple-100"
          label="Total Claim Amount"
          value={data.totalClaimAmount > 0 ? formatCurrency(data.totalClaimAmount) : 'N/A'}
        />
        <SummaryCard
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          iconBg="bg-emerald-100"
          label="Total Settled"
          value={data.totalSettledAmount > 0 ? formatCurrency(data.totalSettledAmount) : 'N/A'}
        />
        <SummaryCard
          icon={<Shield className="w-5 h-5 text-teal-600" />}
          iconBg="bg-teal-100"
          label="Claims Settled"
          value={data.totalClaimsWithSettlement.toString()}
        />
      </div>


      {/* Claims per Week */}
      <BarChartCard
        title="Claims Filed per Week"
        subtitle="Last 12 weeks"
        icon={<AlertTriangle className="w-4 h-4 text-orange-500" />}
        data={data.claimsPerWeek}
        labelKey="weekLabel"
        barColor="bg-orange-400"
        barHoverColor="bg-orange-500"
        emptyMessage="No claims data yet"
      />

      {/* COI Requests per Week */}
      <BarChartCard
        title="COI Requests per Week"
        subtitle="Last 12 weeks"
        icon={<FileText className="w-4 h-4 text-blue-500" />}
        data={data.coiPerWeek}
        labelKey="weekLabel"
        barColor="bg-blue-400"
        barHoverColor="bg-blue-500"
        emptyMessage="No COI request data yet"
      />

      {/* Policy Binds per Month */}
      <BarChartCard
        title="Policy Binds per Month"
        subtitle="Last 12 months (based on policies.created_at)"
        icon={<Shield className="w-4 h-4 text-green-500" />}
        data={data.policyBindsPerMonth}
        labelKey="monthLabel"
        barColor="bg-green-400"
        barHoverColor="bg-green-500"
        emptyMessage="No policy bind data yet"
      />
    </div>
  );
};

// ---- Sub-components ----

interface SummaryCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ icon, iconBg, label, value }) => (
  <Card className="border-0 shadow-sm">
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${iconBg}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-gray-800 truncate">{value}</p>
          <p className="text-xs text-gray-500 truncate">{label}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

interface BarChartCardProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  data: (WeeklyDataPoint | MonthlyDataPoint)[];
  labelKey: 'weekLabel' | 'monthLabel';
  barColor: string;
  barHoverColor: string;
  emptyMessage: string;
}

const BarChartCard: React.FC<BarChartCardProps> = ({
  title,
  subtitle,
  icon,
  data,
  labelKey,
  barColor,
  barHoverColor,
  emptyMessage
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <BarChart3 className="w-10 h-10 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </CardTitle>
        {subtitle && (
          <p className="text-xs text-gray-400">{subtitle}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1 h-40">
          {data.map((point, idx) => {
            const label = (point as any)[labelKey] || '';
            const heightPct = maxCount > 0 ? (point.count / maxCount) * 100 : 0;
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center justify-end h-full relative"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 shadow-lg">
                    {point.count}
                  </div>
                )}
                {/* Bar */}
                <div
                  className={`w-full rounded-t-sm transition-all duration-200 ${
                    isHovered ? barHoverColor : barColor
                  }`}
                  style={{
                    height: `${Math.max(heightPct, 2)}%`,
                    minHeight: point.count > 0 ? '4px' : '2px'
                  }}
                />
                {/* Label */}
                <span className="text-[9px] text-gray-400 mt-1 truncate w-full text-center leading-tight">
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Total */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
          <span className="text-gray-500">Total</span>
          <span className="font-semibold text-gray-800">
            {data.reduce((sum, d) => sum + d.count, 0)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalyticsTab;
