import React, { useState, useEffect } from 'react';
import { ArrowLeft, Building2, Star, Search, Loader2, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Carrier } from '@/types';
import { getActiveCarriers } from '@/api';

interface CarrierBrowserProps {
  onBack: () => void;
  onSelectCarrier: (carrierId: string) => void;
}

const CarrierBrowser: React.FC<CarrierBrowserProps> = ({ onBack, onSelectCarrier }) => {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchCarriers = async () => {
      setLoading(true);
      const data = await getActiveCarriers();
      setCarriers(data);
      setLoading(false);
    };
    fetchCarriers();
  }, []);

  const filtered = carriers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q) ||
      (c.segments || []).some((s) => s.toLowerCase().includes(q))
    );
  });

  const renderStars = (rating: number | null) => {
    if (!rating) return null;
    const fullStars = Math.floor(rating);
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${
              i < fullStars
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-200'
            }`}
          />
        ))}
        <span className="text-xs text-gray-500 ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back</span>
      </button>

      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-gray-800">Browse Carriers</h2>
        <p className="text-sm text-gray-500 mt-1">
          Explore our network of active insurance carriers
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search carriers by name, segment..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F7941D] focus:border-transparent transition-all text-sm"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#F7941D]" />
          <span className="ml-3 text-gray-500">Loading carriers...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <Card className="border-0 shadow-md">
          <CardContent className="p-8 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              {search.trim() ? 'No carriers match your search' : 'No active carriers found'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Carrier Grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid gap-3">
          {filtered.map((carrier) => (
            <button
              key={carrier.id}
              onClick={() => onSelectCarrier(carrier.id)}
              className="w-full bg-white rounded-xl shadow-md p-4 flex items-center gap-4 hover:shadow-lg transition-all active:scale-[0.98] text-left"
            >
              {/* Logo */}
              <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                {carrier.logo_url ? (
                  <img
                    src={carrier.logo_url}
                    alt={carrier.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#1B3A5F]/10">
                    <Building2 className="w-7 h-7 text-[#1B3A5F]" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">{carrier.name}</p>
                {carrier.rating && renderStars(carrier.rating)}
                {carrier.segments && carrier.segments.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {carrier.segments.slice(0, 3).map((seg) => (
                      <Badge
                        key={seg}
                        className="bg-blue-50 text-blue-600 border-0 text-[10px] px-1.5 py-0 capitalize"
                      >
                        {seg}
                      </Badge>
                    ))}
                    {carrier.segments.length > 3 && (
                      <Badge className="bg-gray-100 text-gray-500 border-0 text-[10px] px-1.5 py-0">
                        +{carrier.segments.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
                {carrier.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">{carrier.description}</p>
                )}
              </div>

              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CarrierBrowser;
