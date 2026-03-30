import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, AlertCircle, Info, X, ChevronRight, RefreshCw, ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAdminAlerts, type AdminAlert } from '@/api';

interface AdminAlertsBannerProps {
  onNavigateTab: (tab: string) => void;
}

const AdminAlertsBanner: React.FC<AdminAlertsBannerProps> = ({ onNavigateTab }) => {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await getAdminAlerts();
      setAlerts(data);
    } catch (err) {
      console.error('Error fetching admin alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = (alertId: string) => {
    setDismissedIds(prev => new Set([...prev, alertId]));
  };

  const visibleAlerts = alerts.filter(a => !dismissedIds.has(a.id));

  if (loading || visibleAlerts.length === 0) return null;

  const getSeverityConfig = (severity: AdminAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-50 border-red-200',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          textColor: 'text-red-800',
          descColor: 'text-red-600',
          icon: <AlertTriangle className="w-4 h-4" />,
          badge: 'bg-red-100 text-red-700'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 border-amber-200',
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
          textColor: 'text-amber-800',
          descColor: 'text-amber-600',
          icon: <AlertCircle className="w-4 h-4" />,
          badge: 'bg-amber-100 text-amber-700'
        };
      case 'info':
        return {
          bg: 'bg-blue-50 border-blue-200',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          textColor: 'text-blue-800',
          descColor: 'text-blue-600',
          icon: <Info className="w-4 h-4" />,
          badge: 'bg-blue-100 text-blue-700'
        };
    }
  };

  return (
    <div className="space-y-2 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-500" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Action Required</span>
          <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">
            {visibleAlerts.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchAlerts}
          className="h-6 px-2 text-xs text-gray-400 hover:text-gray-600"
        >
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>

      {/* Alert cards */}
      {visibleAlerts.map(alert => {
        const config = getSeverityConfig(alert.severity);
        return (
          <div
            key={alert.id}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${config.bg} transition-all`}
          >
            <div className={`p-1.5 rounded-md ${config.iconBg} ${config.iconColor} flex-shrink-0`}>
              {config.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={`text-sm font-semibold ${config.textColor}`}>{alert.title}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${config.badge}`}>
                  {alert.count}
                </span>
              </div>
              <p className={`text-xs ${config.descColor} mt-0.5`}>{alert.description}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateTab(alert.linkTab)}
                className={`h-7 px-2 text-xs ${config.textColor} hover:bg-white/50`}
              >
                View <ChevronRight className="w-3 h-3 ml-0.5" />
              </Button>
              <button
                onClick={() => handleDismiss(alert.id)}
                className={`p-1 rounded hover:bg-white/50 ${config.descColor} opacity-50 hover:opacity-100 transition-opacity`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdminAlertsBanner;
