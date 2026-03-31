import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, FileText, Send } from 'lucide-react';

interface Props {
  onStartRequest: () => void;
  onViewHistory: () => void;
}

const InstantCOI: React.FC<Props> = ({ onStartRequest, onViewHistory }) => {
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
              Under 5 minutes
            </Badge>
            <Badge variant="outline">Standard + Special Wording</Badge>
          </div>
          <p className="text-sm text-gray-600">
            Enter certificate holder details, attach requirements, choose certificate type, and deliver instantly.
          </p>
          <div className="flex gap-2">
            <Button onClick={onStartRequest}>
              <Send className="w-4 h-4 mr-2" />
              Start COI Request
            </Button>
            <Button variant="outline" onClick={onViewHistory}>View History</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InstantCOI;
