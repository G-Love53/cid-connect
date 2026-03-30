import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  AlertTriangle, 
  Send, 
  CheckCircle2,
  Loader2,
  Calendar,
  MapPin,
  FileText,
  Shield,
  AlertCircle,
  Camera,
  X,
  Upload,
  Copy,
  Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { Policy } from '@/types';
import { toast } from '@/components/ui/use-toast';
import { submitClaim, uploadClaimPhotos, formatSegmentForApi, getUserPolicies } from '@/api';

interface FileClaimProps {
  onBack: () => void;
}

// Dynamic segment display — colors are generated from the segment name
// No more hardcoded SEGMENT_CONFIG for Bar/Plumber/Roofer
import { getSegmentColorClass } from '@/api';

const getSegmentDisplayConfig = (segment: string) => {
  const name = segment ? segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase() : 'Unknown';
  const teamName = name ? `${name} Insurance Direct` : 'Insurance Direct';
  const colorClass = getSegmentColorClass(segment);
  // Extract text color and bg color from the class string
  const parts = colorClass.split(' ');
  const bgColor = parts[0] || 'bg-gray-100';
  const color = parts[1] || 'text-gray-800';
  return { name, teamName, color, bgColor };
};


// Type of Loss options
const LOSS_TYPES = [
  { value: 'property_damage', label: 'Property Damage' },
  { value: 'bodily_injury', label: 'Bodily Injury' },
  { value: 'theft', label: 'Theft' },
  { value: 'water_damage', label: 'Water Damage' },
  { value: 'fire_damage', label: 'Fire Damage' },
  { value: 'equipment_breakdown', label: 'Equipment Breakdown' },
  { value: 'liability', label: 'Liability Claim' },
  { value: 'other', label: 'Other' }
];

const FileClaim: React.FC<FileClaimProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [claimNumber, setClaimNumber] = useState('');
  const [backendResponse, setBackendResponse] = useState<any>(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [copiedClaimNumber, setCopiedClaimNumber] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    typeOfLoss: '',
    dateOfIncident: '',
    locationOfIncident: '',
    detailedDescription: '',
    estimatedAmount: '',
    thirdPartyName: '',
    thirdPartyContact: ''
  });

  // Get formatted segment for display — now dynamic
  const segment = selectedPolicy?.segment ? formatSegmentForApi(selectedPolicy.segment) : '';
  const segmentConfig = getSegmentDisplayConfig(selectedPolicy?.segment || '');


  useEffect(() => {
    if (user) {
      fetchPolicies();
    }
  }, [user]);

  // Update selected policy when selection changes
  useEffect(() => {
    if (selectedPolicyId) {
      const policy = policies.find(p => p.id === selectedPolicyId);
      setSelectedPolicy(policy || null);
    }
  }, [selectedPolicyId, policies]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      photoPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [photoPreviewUrls]);

  const fetchPolicies = async () => {
    if (!user) return;
    
    try {
      const userPolicies = await getUserPolicies(user.id);
      const activePolicies = userPolicies.filter(p => p.status === 'active');
      setPolicies(activePolicies);
      
      // Auto-select if only one policy
      if (activePolicies.length > 0) {
        setSelectedPolicyId(activePolicies[0].id);
        setSelectedPolicy(activePolicies[0]);
      }
    } catch (err) {
      console.error('Error fetching policies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 5 photos
    const newPhotos = [...photos, ...files].slice(0, 5);
    setPhotos(newPhotos);

    // Create preview URLs
    const newPreviewUrls = newPhotos.map(file => URL.createObjectURL(file));
    // Revoke old URLs
    photoPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    setPhotoPreviewUrls(newPreviewUrls);
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);

    // Revoke the removed URL
    URL.revokeObjectURL(photoPreviewUrls[index]);
    const newPreviewUrls = photoPreviewUrls.filter((_, i) => i !== index);
    setPhotoPreviewUrls(newPreviewUrls);
  };

  const handleCopyClaimNumber = () => {
    navigator.clipboard.writeText(claimNumber);
    setCopiedClaimNumber(true);
    setTimeout(() => setCopiedClaimNumber(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !selectedPolicy) {
      toast({
        title: 'Error',
        description: 'No active policy selected',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.typeOfLoss || !formData.dateOfIncident || !formData.locationOfIncident || !formData.detailedDescription) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    
    try {
      // Generate claim number for photo upload
      const tempClaimNumber = `CLM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      // Upload photos if any
      let uploadedPhotoPaths: string[] = [];
      if (photos.length > 0) {
        setUploadingPhotos(true);
        toast({
          title: 'Uploading Photos',
          description: `Uploading ${photos.length} photo(s)...`
        });
        
        uploadedPhotoPaths = await uploadClaimPhotos(user.id, tempClaimNumber, photos);
        setUploadingPhotos(false);
      }

      // Submit claim with photos
      const { claim, backendResponse: response } = await submitClaim(user.id, {
        policyId: selectedPolicy.id,
        policyNumber: selectedPolicy.policy_number,
        businessName: selectedPolicy.business_name,
        segment: selectedPolicy.segment || 'bar',
        typeOfLoss: formData.typeOfLoss,
        dateOfIncident: formData.dateOfIncident,
        locationOfIncident: formData.locationOfIncident.trim(),
        detailedDescription: formData.detailedDescription.trim(),
        estimatedAmount: formData.estimatedAmount ? parseFloat(formData.estimatedAmount) : undefined,
        thirdPartyName: formData.thirdPartyName.trim() || undefined,
        thirdPartyContact: formData.thirdPartyContact.trim() || undefined,
        photos: uploadedPhotoPaths
      });

      if (claim) {
        setClaimNumber(claim.claim_number || tempClaimNumber);
        setBackendResponse(response);
        setSubmitted(true);
        
        toast({
          title: 'Claim Submitted',
          description: `Your claim has been filed with the ${segmentConfig.teamName} team.`
        });
      }
    } catch (err: any) {
      console.error('Error submitting claim:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to submit claim',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
      setUploadingPhotos(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Services</span>
        </button>
        <Card className="border-0 shadow-md">
          <CardContent className="p-6 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#F7941D]" />
            <span className="ml-2 text-gray-600">Loading policies...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Services</span>
        </button>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Claim Submitted!</h2>
            <p className="text-gray-600 mb-4">
              Your claim has been filed successfully.
            </p>
            
            {/* Claim Number with Copy */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-500">Claim Number</p>
              <div className="flex items-center justify-center gap-2 mt-1">
                <code className="text-xl font-bold text-[#1B3A5F] font-mono">{claimNumber}</code>
                <button
                  onClick={handleCopyClaimNumber}
                  className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Copy claim number"
                >
                  {copiedClaimNumber ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            
            {/* Segment-specific success message */}
            <div className={`${segmentConfig.bgColor} rounded-lg p-4 mb-4`}>
              <p className={`text-sm font-medium ${segmentConfig.color}`}>
                Your claim is being processed by the {segmentConfig.teamName} team
              </p>
              <p className="text-sm text-gray-600 mt-1">
                A claims adjuster will contact you within 24-48 hours.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
              <p className="text-sm text-gray-500 mb-2">Claim Details</p>
              <div className="space-y-1">
                <p className="text-sm"><span className="text-gray-500">Type:</span> <span className="font-medium">{LOSS_TYPES.find(t => t.value === formData.typeOfLoss)?.label}</span></p>
                <p className="text-sm"><span className="text-gray-500">Date:</span> <span className="font-medium">{formData.dateOfIncident}</span></p>
                <p className="text-sm"><span className="text-gray-500">Location:</span> <span className="font-medium">{formData.locationOfIncident}</span></p>
                {photos.length > 0 && (
                  <p className="text-sm"><span className="text-gray-500">Photos:</span> <span className="font-medium">{photos.length} uploaded</span></p>
                )}
              </div>
            </div>
            
            {/* Backend Response Display */}
            {backendResponse && (
              <div className={`rounded-lg p-4 mb-4 text-left ${
                backendResponse.warning 
                  ? 'bg-yellow-50 border border-yellow-200' 
                  : 'bg-green-50 border border-green-200'
              }`}>
                <p className={`text-sm font-medium ${
                  backendResponse.warning ? 'text-yellow-800' : 'text-green-800'
                }`}>
                  {backendResponse.warning ? 'Notice' : 'Backend Confirmation'}
                </p>
                <p className={`text-sm mt-1 ${
                  backendResponse.warning ? 'text-yellow-700' : 'text-green-700'
                }`}>
                  {backendResponse.message || 'Claim notification sent successfully.'}
                </p>
              </div>
            )}

            {selectedPolicy && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-500">Policy</p>
                <p className="font-semibold text-gray-800">{selectedPolicy.policy_number}</p>
                <p className="text-xs text-gray-500 capitalize mt-1">Segment: {segment}</p>
              </div>
            )}

            <Button onClick={onBack} className="bg-[#F7941D] hover:bg-[#E07D0D]">
              Return to Services
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Services</span>
      </button>

      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-[#F7941D]/10 rounded-lg">
          <AlertTriangle className="w-6 h-6 text-[#F7941D]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">File a Claim</h1>
          <p className="text-sm text-gray-500">Report an incident or loss</p>
        </div>
      </div>

      {policies.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No active policy found. Please contact your agent.</p>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Policy Selector */}
          {policies.length > 1 && (
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Select Policy</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={selectedPolicyId || ''}
                  onValueChange={(value) => setSelectedPolicyId(value)}
                >
                  <SelectTrigger className="border-gray-200 focus:ring-[#F7941D] focus:border-[#F7941D]">
                    <SelectValue placeholder="Select a policy..." />
                  </SelectTrigger>
                  <SelectContent>
                    {policies.map((policy) => (
                      <SelectItem key={policy.id} value={policy.id}>
                        {policy.policy_number} — {policy.business_name} ({policy.segment})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Policy & Segment Info */}
          {selectedPolicy && (
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Policy Reference</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-[#1B3A5F]">{selectedPolicy.policy_number}</p>
                <p className="text-sm text-gray-600">{selectedPolicy.business_name}</p>
                <div className={`inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full ${segmentConfig.bgColor}`}>
                  <span className={`text-xs font-medium ${segmentConfig.color}`}>
                    {segmentConfig.teamName}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Incident Details */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-base">Incident Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="typeOfLoss" className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gray-400" />
                  Type of Loss *
                </Label>
                <Select
                  value={formData.typeOfLoss}
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    typeOfLoss: value 
                  }))}
                >
                  <SelectTrigger className="border-gray-200 focus:ring-[#F7941D] focus:border-[#F7941D]">
                    <SelectValue placeholder="Select type of loss" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOSS_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfIncident" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  Date of Incident *
                </Label>
                <Input
                  id="dateOfIncident"
                  type="date"
                  value={formData.dateOfIncident}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    dateOfIncident: e.target.value 
                  }))}
                  max={new Date().toISOString().split('T')[0]}
                  className="border-gray-200 focus:ring-[#F7941D] focus:border-[#F7941D]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationOfIncident" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  Location of Incident *
                </Label>
                <Input
                  id="locationOfIncident"
                  placeholder="Address or location where the incident occurred"
                  value={formData.locationOfIncident}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    locationOfIncident: e.target.value 
                  }))}
                  className="border-gray-200 focus:ring-[#F7941D] focus:border-[#F7941D]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="detailedDescription" className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  Detailed Description *
                </Label>
                <Textarea
                  id="detailedDescription"
                  placeholder="Please provide a detailed description of what happened, including any relevant circumstances, witnesses, or other information..."
                  rows={5}
                  value={formData.detailedDescription}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    detailedDescription: e.target.value 
                  }))}
                  className="border-gray-200 resize-none focus:ring-[#F7941D] focus:border-[#F7941D]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedAmount">Estimated Loss Amount (Optional)</Label>
                <Input
                  id="estimatedAmount"
                  type="number"
                  placeholder="$0.00"
                  value={formData.estimatedAmount}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    estimatedAmount: e.target.value 
                  }))}
                  className="border-gray-200 focus:ring-[#F7941D] focus:border-[#F7941D]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Photo Upload */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="w-5 h-5 text-gray-400" />
                Photos (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500">
                Upload up to 5 photos of the damage or incident scene.
              </p>
              
              {/* Photo Previews */}
              {photoPreviewUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photoPreviewUrls.map((url, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <img 
                        src={url} 
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Button */}
              {photos.length < 5 && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-dashed border-2 h-20"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-500">
                        {photos.length === 0 ? 'Add Photos' : `Add More (${5 - photos.length} remaining)`}
                      </span>
                    </div>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Third Party Info (Optional) */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-base">Third Party Information (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="thirdPartyName">Third Party Name</Label>
                <Input
                  id="thirdPartyName"
                  placeholder="Name of any other party involved"
                  value={formData.thirdPartyName}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    thirdPartyName: e.target.value 
                  }))}
                  className="border-gray-200 focus:ring-[#F7941D] focus:border-[#F7941D]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="thirdPartyContact">Third Party Contact</Label>
                <Input
                  id="thirdPartyContact"
                  placeholder="Phone or email"
                  value={formData.thirdPartyContact}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    thirdPartyContact: e.target.value 
                  }))}
                  className="border-gray-200 focus:ring-[#F7941D] focus:border-[#F7941D]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Routing Info */}
          {selectedPolicy && (
            <div className={`${segmentConfig.bgColor} rounded-lg p-3`}>
              <p className={`text-xs ${segmentConfig.color}`}>
                This claim will be routed to: <span className="font-semibold">{segmentConfig.teamName}</span>
              </p>
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting || loading || !selectedPolicy}
            className="w-full h-12 bg-[#F7941D] hover:bg-[#E07D0D] text-white font-semibold"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {uploadingPhotos ? 'Uploading Photos...' : 'Submitting Claim...'}
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Submit Claim
              </>
            )}
          </Button>
        </form>
      )}
    </div>
  );
};

export default FileClaim;
