import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  MapPin,
  Calendar,
  Camera,
  DollarSign,
  FileWarning,
  User,
  Phone,
  Copy,
  Loader2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
  Shield,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Claim } from '@/types';
import { getClaimPhotoUrl } from '@/api';
import { toast } from '@/components/ui/use-toast';

interface ClaimDetailProps {
  claim: Claim;
  onBack: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  submitted: {
    label: 'Submitted',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100 text-blue-800',
    icon: <Clock className="w-4 h-4" />
  },
  pending: {
    label: 'Pending',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100 text-yellow-800',
    icon: <Clock className="w-4 h-4" />
  },
  under_review: {
    label: 'Under Review',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100 text-purple-800',
    icon: <Eye className="w-4 h-4" />
  },
  approved: {
    label: 'Approved',
    color: 'text-green-700',
    bgColor: 'bg-green-100 text-green-800',
    icon: <CheckCircle2 className="w-4 h-4" />
  },
  denied: {
    label: 'Denied',
    color: 'text-red-700',
    bgColor: 'bg-red-100 text-red-800',
    icon: <XCircle className="w-4 h-4" />
  },
  closed: {
    label: 'Closed',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100 text-gray-700',
    icon: <CheckCircle2 className="w-4 h-4" />
  }
};

const STATUS_ORDER = ['submitted', 'pending', 'under_review', 'approved', 'closed'];

const ClaimDetail: React.FC<ClaimDetailProps> = ({ claim, onBack }) => {
  const [photoUrls, setPhotoUrls] = useState<(string | null)[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const statusInfo = STATUS_CONFIG[claim.status] || STATUS_CONFIG.submitted;
  const photoPaths = claim.photos || [];

  useEffect(() => {
    if (photoPaths.length > 0) {
      loadPhotos();
    }
  }, [claim.id]);

  const loadPhotos = async () => {
    setLoadingPhotos(true);
    try {
      const urls = await Promise.all(
        photoPaths.map(path => getClaimPhotoUrl(path))
      );
      setPhotoUrls(urls);
    } catch (err) {
      console.error('Error loading photos:', err);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const copyClaimNumber = () => {
    if (claim.claim_number) {
      navigator.clipboard.writeText(claim.claim_number);
      toast({
        title: 'Copied',
        description: 'Claim number copied to clipboard'
      });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Determine where the current status falls in the timeline
  const currentStatusIndex = STATUS_ORDER.indexOf(claim.status);
  const isDenied = claim.status === 'denied';

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Claim History</span>
      </button>

      {/* Claim Header */}
      <Card className="border-0 shadow-md overflow-hidden">
        <div className={`px-4 py-3 ${
          claim.status === 'denied' ? 'bg-red-50' :
          claim.status === 'approved' ? 'bg-green-50' :
          claim.status === 'closed' ? 'bg-gray-50' :
          'bg-blue-50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                claim.status === 'denied' ? 'bg-red-100' :
                claim.status === 'approved' ? 'bg-green-100' :
                'bg-[#F7941D]/10'
              }`}>
                <AlertTriangle className={`w-5 h-5 ${
                  claim.status === 'denied' ? 'text-red-600' :
                  claim.status === 'approved' ? 'text-green-600' :
                  'text-[#F7941D]'
                }`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono font-bold text-[#1B3A5F]">
                    {claim.claim_number || 'Pending'}
                  </code>
                  {claim.claim_number && (
                    <button
                      onClick={copyClaimNumber}
                      className="p-1 hover:bg-white/50 rounded transition-colors"
                      title="Copy claim number"
                    >
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Filed {formatDateTime(claim.created_at)}
                </p>
              </div>
            </div>
            <Badge className={`${statusInfo.bgColor} flex items-center gap-1`}>
              {statusInfo.icon}
              {statusInfo.label}
            </Badge>
          </div>
        </div>

        <CardContent className="p-4 space-y-4">
          {/* Status Timeline */}
          <div className="py-2">
            <p className="text-xs font-medium text-gray-500 mb-3">STATUS PROGRESS</p>
            <div className="flex items-center gap-1">
              {STATUS_ORDER.map((step, idx) => {
                const isActive = isDenied
                  ? step === 'submitted' || step === 'pending'
                  : idx <= currentStatusIndex;
                const isCurrent = step === claim.status;
                const stepConfig = STATUS_CONFIG[step];

                return (
                  <React.Fragment key={step}>
                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isCurrent
                          ? isDenied
                            ? 'bg-red-500 text-white'
                            : 'bg-[#F7941D] text-white'
                          : isActive
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-400'
                      }`}>
                        {isActive && !isCurrent ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <span className={`text-[10px] mt-1 text-center leading-tight ${
                        isCurrent ? 'font-semibold text-gray-800' : 'text-gray-400'
                      }`}>
                        {stepConfig?.label || step}
                      </span>
                    </div>
                    {idx < STATUS_ORDER.length - 1 && (
                      <div className={`h-0.5 flex-1 mt-[-16px] ${
                        isActive && idx < currentStatusIndex ? 'bg-green-400' : 'bg-gray-200'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            {isDenied && (
              <div className="mt-2 flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg p-2">
                <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                This claim has been denied.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Incident Details */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-500 flex items-center gap-2">
            <Info className="w-4 h-4" />
            INCIDENT DETAILS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Claim Type */}
          {claim.claim_type && (
            <div className="flex items-start gap-3">
              <FileWarning className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Type of Loss</p>
                <p className="text-sm font-medium text-gray-800 capitalize">
                  {claim.claim_type.replace(/_/g, ' ')}
                </p>
              </div>
            </div>
          )}

          {/* Incident Date */}
          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Incident Date</p>
              <p className="text-sm font-medium text-gray-800">
                {formatDate(claim.incident_date)}
                {claim.incident_time && ` at ${claim.incident_time}`}
              </p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Location</p>
              <p className="text-sm font-medium text-gray-800">{claim.incident_location}</p>
            </div>
          </div>

          {/* Description */}
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Description</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {claim.description}
            </p>
          </div>

          {/* Estimated Amount */}
          {claim.estimated_amount != null && claim.estimated_amount > 0 && (
            <div className="flex items-start gap-3 pt-2 border-t border-gray-100">
              <DollarSign className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Estimated Amount</p>
                <p className="text-sm font-semibold text-gray-800">
                  ${claim.estimated_amount.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Segment */}
          {claim.segment && (
            <div className="flex items-start gap-3 pt-2 border-t border-gray-100">
              <Shield className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Policy Segment</p>
                <Badge variant="outline" className="capitalize mt-0.5">{claim.segment}</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Third Party Information */}
      {(claim.third_party_name || claim.third_party_contact || claim.third_party_insurance) && (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-500 flex items-center gap-2">
              <User className="w-4 h-4" />
              THIRD PARTY INFORMATION
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {claim.third_party_name && (
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Name</p>
                  <p className="text-sm font-medium text-gray-800">{claim.third_party_name}</p>
                </div>
              </div>
            )}
            {claim.third_party_contact && (
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Contact</p>
                  <p className="text-sm font-medium text-gray-800">{claim.third_party_contact}</p>
                </div>
              </div>
            )}
            {claim.third_party_insurance && (
              <div className="flex items-start gap-3">
                <Shield className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Insurance</p>
                  <p className="text-sm font-medium text-gray-800">{claim.third_party_insurance}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Adjuster Information */}
      {claim.adjuster_name && (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-500 flex items-center gap-2">
              <User className="w-4 h-4" />
              ASSIGNED ADJUSTER
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#1B3A5F] flex items-center justify-center text-white font-bold">
                {claim.adjuster_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-800">{claim.adjuster_name}</p>
                {claim.adjuster_phone && (
                  <a
                    href={`tel:${claim.adjuster_phone}`}
                    className="text-sm text-[#F7941D] hover:underline flex items-center gap-1"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {claim.adjuster_phone}
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photos */}
      {photoPaths.length > 0 && (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-500 flex items-center gap-2">
              <Camera className="w-4 h-4" />
              PHOTOS ({photoPaths.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPhotos ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-[#F7941D]" />
                <span className="ml-2 text-sm text-gray-500">Loading photos...</span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {photoUrls.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => url && setLightboxIndex(idx)}
                    className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity relative group"
                  >
                    {url ? (
                      <>
                        <img
                          src={url}
                          alt={`Claim photo ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="w-6 h-6 text-gray-300" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {claim.notes && (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-500">NOTES</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{claim.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Backend Warning */}
      {claim.backend_response?.warning && (
        <Card className="border-0 shadow-sm border-l-4 border-l-amber-400">
          <CardContent className="p-4">
            <p className="text-sm text-amber-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Backend notification pending — our team will process this claim manually.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Timestamps */}
      <div className="text-xs text-gray-400 text-center pb-4">
        Created: {formatDateTime(claim.created_at)}
        {claim.updated_at && claim.updated_at !== claim.created_at && (
          <> &middot; Updated: {formatDateTime(claim.updated_at)}</>
        )}
      </div>

      {/* Photo Lightbox */}
      {lightboxIndex !== null && photoUrls[lightboxIndex] && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <button
            onClick={() => setLightboxIndex(Math.max(0, lightboxIndex - 1))}
            disabled={lightboxIndex === 0}
            className="absolute left-4 p-2 text-white hover:bg-white/20 rounded-full transition-colors disabled:opacity-30"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          <img
            src={photoUrls[lightboxIndex]!}
            alt={`Claim photo ${lightboxIndex + 1}`}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
          />

          <button
            onClick={() => setLightboxIndex(Math.min(photoUrls.length - 1, lightboxIndex + 1))}
            disabled={lightboxIndex === photoUrls.length - 1}
            className="absolute right-4 p-2 text-white hover:bg-white/20 rounded-full transition-colors disabled:opacity-30"
          >
            <ChevronRight className="w-8 h-8" />
          </button>

          <div className="absolute bottom-4 text-white text-sm">
            {lightboxIndex + 1} / {photoUrls.length}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaimDetail;
