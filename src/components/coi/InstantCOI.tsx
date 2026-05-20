import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, FileText, Loader2, Send, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserCoiRequests } from '@/api';
import type { COIRequest } from '@/types';
import { formatCoiStatus, isCoiInProgress } from '@/lib/coiUtils';
import CoiStatusPipeline from '@/components/coi/CoiStatusPipeline';

interface Props {
  onStartRequest: () => void;
  onViewHistory: () => void;
}

const InstantCOI: React.FC<Props> = ({ onStartRequest, onViewHistory }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeRequests, setActiveRequests] = useState<COIRequest[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const rows = await getUserCoiRequests(user.id);
        setActiveRequests(rows.filter((r) => isCoiInProgress(r.status)).slice(0, 3));
      } catch {
        setActiveRequests([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#F7941D]" />
            Instant COI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Badge className="bg-orange-100 text-orange-700 border-0">
              <Clock className="w-3 h-3 mr-1" />
              Track every request
            </Badge>
            <Badge variant="outline">Saved certificate holders</Badge>
            <Badge variant="outline">Standard + special wording</Badge>
          </div>
          <p className="text-sm text-gray-600">
            Request a certificate, track who it was sent to, and reissue for repeat holders in minutes.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={onStartRequest}>
              <Send className="w-4 h-4 mr-2" />
              Request COI
            </Button>
            <Button variant="outline" onClick={onViewHistory}>
              Track &amp; History
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="border-0 shadow-md">
          <CardContent className="p-6 flex items-center justify-center text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Checking active requests…
          </CardContent>
        </Card>
      ) : activeRequests.length > 0 ? (
        <Card className="border-0 shadow-md border-l-4 border-l-[#F7941D]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#F7941D]" />
              In progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeRequests.map((request) => (
              <div key={request.id} className="space-y-2 pb-3 border-b last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm text-gray-800">{request.certificate_holder_name}</p>
                    <p className="text-xs text-gray-500">{request.request_number}</p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {formatCoiStatus(request.status)}
                  </Badge>
                </div>
                <CoiStatusPipeline status={request.status} compact />
              </div>
            ))}
            <Button variant="link" className="px-0 h-auto text-[#F7941D]" onClick={onViewHistory}>
              View all requests
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default InstantCOI;
