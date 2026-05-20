import React from 'react';
import { BookUser, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { CertificateHolder } from '@/lib/coiUtils';

interface Props {
  holders: CertificateHolder[];
  onReissue: (holder: CertificateHolder) => void;
}

const CertificateHolderBook: React.FC<Props> = ({ holders, onReissue }) => {
  if (!holders.length) return null;

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BookUser className="w-5 h-5 text-[#F7941D]" />
          Certificate Holders
        </CardTitle>
        <p className="text-sm text-gray-500">
          Saved from your past requests — reissue in one tap.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {holders.slice(0, 6).map((holder) => (
          <div
            key={holder.key}
            className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-gray-50/80"
          >
            <div className="min-w-0">
              <p className="font-medium text-sm text-gray-800 truncate">{holder.holderName}</p>
              <p className="text-xs text-gray-500 truncate">{holder.email}</p>
              {(holder.city || holder.state) && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {[holder.city, holder.state].filter(Boolean).join(', ')}
                </p>
              )}
              <p className="text-[11px] text-gray-400 mt-1">
                {holder.requestCount} request{holder.requestCount !== 1 ? 's' : ''}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => onReissue(holder)}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reissue
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default CertificateHolderBook;
