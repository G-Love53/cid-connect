import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  FileText,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { getUserRecentActivity, formatRelativeTime, ActivityItem } from '@/api';

interface ServicesActivityFeedProps {
  onNavigateActivity?: (item: ActivityItem) => void;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  claim: <AlertTriangle className="w-4 h-4 text-orange-500" />,
  coi: <FileText className="w-4 h-4 text-blue-500" />,
  policy: <Shield className="w-4 h-4 text-green-500" />
};

const TYPE_LABEL: Record<string, string> = {
  claim: 'Claim',
  coi: 'COI',
  policy: 'Policy'
};

const STATUS_COLOR: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-700',
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-yellow-100 text-yellow-700',
  under_review: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  completed: 'bg-green-100 text-green-700',
  active: 'bg-green-100 text-green-700',
  denied: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
  closed: 'bg-gray-100 text-gray-700',
  expired: 'bg-gray-100 text-gray-600'
};

const ServicesActivityFeed: React.FC<ServicesActivityFeedProps> = ({ onNavigateActivity }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadActivity();
    }
  }, [user]);

  const loadActivity = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getUserRecentActivity(user.id);
      setItems(data);
    } catch (err) {
      console.error('Error loading activity:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-[#F7941D]" />
        <span className="ml-2 text-sm text-gray-500">Loading activity...</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-6 text-center">
        <div>
          <Clock className="w-10 h-10 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No recent activity</p>
          <p className="text-xs text-gray-400">Your requests and claims will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {items.map((item) => (
        <button
          key={`${item.type}-${item.id}`}
          onClick={() => onNavigateActivity?.(item)}
          className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="p-1.5 bg-gray-50 rounded-lg flex-shrink-0">
            {TYPE_ICON[item.type] || <Clock className="w-4 h-4 text-gray-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono font-semibold text-[#1B3A5F] truncate">
                {item.reference_number}
              </code>
              <Badge className={`text-[10px] px-1.5 py-0 ${STATUS_COLOR[item.status] || 'bg-gray-100 text-gray-700'}`}>
                {item.status.replace(/_/g, ' ')}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 truncate mt-0.5">{item.description}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[10px] text-gray-400">{formatRelativeTime(item.timestamp)}</span>
            {onNavigateActivity && <ChevronRight className="w-3.5 h-3.5 text-gray-300" />}
          </div>
        </button>
      ))}
    </div>
  );
};

export default ServicesActivityFeed;
