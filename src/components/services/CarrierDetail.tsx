import React, { useState, useEffect } from 'react';
import { ArrowLeft, Building2, Star, Shield, FileText, Loader2, MapPin, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Carrier, Policy } from '@/types';
import { getCarrierById, getCarrierPolicies } from '@/api';
import CarrierResourcesSection from '@/components/CarrierResourcesSection';

interface CarrierDetailProps {
  carrierId: string;
  onBack: () => void;
}

const CarrierDetail: React.FC<CarrierDetailProps> = ({ carrierId, onBack }) => {
  const [carrier, setCarrier] = useState<Carrier | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [carrierData, policiesData] = await Promise.all([
        getCarrierById(carrierId),
        getCarrierPolicies(carrierId)
      ]);
      setCarrier(carrierData);
      setPolicies(policiesData);
      setLoading(false);
    };
    fetchData();
  }, [carrierId]);

  const renderStars = (rating: number | null) => {
    if (!rating) return null;
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.3;
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-5 h-5 ${
              i < fullStars
                ? 'text-yellow-400 fill-yellow-400'
                : i === fullStars && hasHalf
                ? 'text-yellow-400 fill-yellow-400/50'
                : 'text-gray-200'
            }`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-2 font-semibold">{rating.toFixed(1)}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#F7941D]" />
        </div>
      </div>
    );
  }

  if (!carrier) {
    return (
      <div className="space-y-6">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <Card className="border-0 shadow-md">
          <CardContent className="p-8 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Carrier not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine the first segment for resources (or empty string if none)
  const resourceSegment = carrier.segments?.[0] ?? '';

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Policy</span>
      </button>

      {/* Carrier Header Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-[#1B3A5F] to-[#2C5282] text-white overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-white/20">
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
                <div className="w-full h-full flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold mb-1">{carrier.name}</h1>
              {carrier.rating && (
                <div className="flex items-center gap-0.5 mb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(carrier.rating!)
                          ? 'text-yellow-300 fill-yellow-300'
                          : 'text-white/30'
                      }`}
                    />
                  ))}
                  <span className="text-sm text-blue-200 ml-2">{carrier.rating.toFixed(1)}</span>
                </div>
              )}
              <Badge className="bg-green-500/20 text-green-200 border-0">
                <CheckCircle className="w-3 h-3 mr-1" />
                Active Partner
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      {carrier.description && (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#F7941D]" />
              About
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 leading-relaxed">{carrier.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Segments */}
      {carrier.segments && carrier.segments.length > 0 && (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#F7941D]" />
              Covered Segments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {carrier.segments.map((seg) => (
                <Badge key={seg} className="bg-blue-50 text-blue-700 capitalize">
                  {seg}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Carrier Resources Section */}
      {resourceSegment ? (
        <CarrierResourcesSection
          carrierName={carrier.name}
          segment={resourceSegment}
          availableSegments={carrier.segments && carrier.segments.length > 1 ? carrier.segments : undefined}
        />
      ) : null}

      {/* Policies with this carrier */}
      {policies.length > 0 && (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#F7941D]" />
              Your Policies ({policies.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {policies.map((policy) => (
              <div key={policy.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-mono font-semibold text-sm text-[#1B3A5F]">{policy.policy_number}</p>
                  <p className="text-xs text-gray-500">{policy.business_name}</p>
                </div>
                <div className="text-right">
                  <Badge className={policy.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                    {policy.status}
                  </Badge>
                  <p className="text-xs text-gray-400 mt-1">${policy.premium?.toLocaleString()}/yr</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Button onClick={onBack} variant="outline" className="w-full">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Policy Vault
      </Button>
    </div>
  );
};

export default CarrierDetail;
