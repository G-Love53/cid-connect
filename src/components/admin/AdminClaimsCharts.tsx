import React, { useState, useEffect, useMemo } from 'react';
import {
  Loader2, Download, Calendar, Filter, BarChart3, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar
} from 'recharts';
import { Claim } from '@/types';
import { getAllClaims, downloadFilteredClaimsCsv } from '@/api';

const STATUS_COLORS: Record<string, string> = {
  submitted: '#3B82F6',
  pending: '#F59E0B',
  under_review: '#8B5CF6',
  approved: '#22C55E',
  denied: '#EF4444',
  closed: '#6B7280'
};

const AdminClaimsCharts: React.FC = () => {
  const [allClaims, setAllClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    setLoading(true);
    const data = await getAllClaims();
    setAllClaims(data);
    setLoading(false);
  };

  // Filter claims by date range (using created_at)
  const filteredClaims = useMemo(() => {
    return allClaims.filter(c => {
      const createdDate = c.created_at.split('T')[0];
      if (startDate && createdDate < startDate) return false;
      if (endDate && createdDate > endDate) return false;
      return true;
    });
  }, [allClaims, startDate, endDate]);

  // --- PIE CHART DATA: claims by status ---
  const pieData = useMemo(() => {
    const statusMap: Record<string, number> = {};
    filteredClaims.forEach(c => {
      const s = c.status || 'unknown';
      statusMap[s] = (statusMap[s] || 0) + 1;
    });
    return Object.entries(statusMap).map(([name, value]) => ({
      name: name.replace(/_/g, ' '),
      value,
      fill: STATUS_COLORS[name] || '#94A3B8'
    }));
  }, [filteredClaims]);

  // --- LINE CHART DATA: claims over time (weekly buckets) ---
  const lineData = useMemo(() => {
    if (filteredClaims.length === 0) return [];

    // Group by week
    const weekMap: Record<string, number> = {};
    filteredClaims.forEach(c => {
      const d = new Date(c.created_at);
      const monday = new Date(d);
      const day = monday.getDay();
      const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
      monday.setDate(diff);
      const weekKey = monday.toISOString().split('T')[0];
      weekMap[weekKey] = (weekMap[weekKey] || 0) + 1;
    });

    return Object.entries(weekMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, count]) => ({
        week: new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        claims: count
      }));
  }, [filteredClaims]);

  // --- BAR CHART DATA: settlement vs estimated (top claims with amounts) ---
  const barData = useMemo(() => {
    return filteredClaims
      .filter(c => c.estimated_amount || c.settlement_amount)
      .slice(0, 15) // Top 15 claims
      .map(c => ({
        name: c.claim_number?.substring(0, 12) || c.id.substring(0, 8),
        estimated: Number(c.estimated_amount) || 0,
        settlement: Number(c.settlement_amount) || 0
      }));
  }, [filteredClaims]);

  const handleDownloadCsv = () => {
    const dateLabel = [startDate, endDate].filter(Boolean).join('_to_');
    const filename = dateLabel
      ? `claims-filtered-${dateLabel}.csv`
      : `claims-all-${new Date().toISOString().split('T')[0]}.csv`;
    downloadFilteredClaimsCsv(filteredClaims, filename);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600 font-medium">Date Range:</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[150px] h-8 text-sm"
                placeholder="Start"
              />
              <span className="text-gray-400">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[150px] h-8 text-sm"
                placeholder="End"
              />
            </div>
            {(startDate || endDate) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-xs text-gray-500"
              >
                Clear
              </Button>
            )}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-gray-400">{filteredClaims.length} claims</span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadCsv}
                className="flex items-center gap-1 text-xs"
              >
                <Download className="w-3 h-3" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredClaims.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No claims found for the selected date range</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Row 1: Pie + Line */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pie Chart: Claims by Status */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#F7941D]" />
                  Claims by Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name} (${value})`}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value: string) => (
                        <span className="text-xs text-gray-600 capitalize">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Line Chart: Claims Over Time */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#3B82F6]" />
                  Claims Over Time (Weekly)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 10, fill: '#6B7280' }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#6B7280' }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="claims"
                      stroke="#F7941D"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#F7941D' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Bar Chart */}
          {barData.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#22C55E]" />
                  Estimated vs Settlement Amount (Top Claims)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 9, fill: '#6B7280' }}
                      interval={0}
                      angle={-30}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#6B7280' }}
                      tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={30}
                      formatter={(value: string) => (
                        <span className="text-xs text-gray-600 capitalize">{value}</span>
                      )}
                    />
                    <Bar dataKey="estimated" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Estimated" />
                    <Bar dataKey="settlement" fill="#22C55E" radius={[4, 4, 0, 0]} name="Settlement" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-gray-800">{filteredClaims.length}</p>
                <p className="text-xs text-gray-500">Total Claims</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-gray-800">
                  {filteredClaims.filter(c => c.status === 'approved' || c.status === 'closed').length}
                </p>
                <p className="text-xs text-gray-500">Resolved</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-[#F7941D]">
                  ${filteredClaims.reduce((sum, c) => sum + (Number(c.estimated_amount) || 0), 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">Total Estimated</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-green-600">
                  ${filteredClaims.reduce((sum, c) => sum + (Number(c.settlement_amount) || 0), 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">Total Settled</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminClaimsCharts;
