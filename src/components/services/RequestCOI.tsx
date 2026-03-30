import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  FileText, 
  Send, 
  CheckCircle2,
  Loader2,
  Upload,
  X,
  FileUp,
  Bot,
  User,
  Mail,
  MapPin,
  Building2,
  AlertTriangle,
  Copy,
  Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { submitCoiRequest, getUserPolicies } from '@/api';
import { Policy } from '@/types';

interface RequestCOIProps {
  onBack: () => void;
}

// Certificate type options
const CERTIFICATE_TYPES = [
  { value: 'standard', label: 'Standard Proof of Insurance' },
  { value: 'waiver_subrogation', label: 'Include Waiver of Subrogation' },
  { value: 'primary_noncontributory', label: 'Include Primary & Non-Contributory' },
  { value: 'special_wording', label: 'Special Wording Required' },
];

// US States for dropdown
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

const RequestCOI: React.FC<RequestCOIProps> = ({ onBack }) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [copiedRequestNumber, setCopiedRequestNumber] = useState(false);
  
  // Policy context
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [loadingPolicies, setLoadingPolicies] = useState(true);

  // Result from submission
  const [submittedRequestNumber, setSubmittedRequestNumber] = useState('');
  const [backendWarning, setBackendWarning] = useState(false);
  
  const [formData, setFormData] = useState({
    holderName: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    email: '',
    certificateType: '',
    additionalInstructions: ''
  });

  // Fetch user's policies on mount
  useEffect(() => {
    const fetchPolicies = async () => {
      if (!user) return;
      try {
        const userPolicies = await getUserPolicies(user.id);
        const activePolicies = userPolicies.filter(p => p.status === 'active');
        setPolicies(activePolicies);
        
        // Auto-select first active policy
        if (activePolicies.length > 0) {
          setSelectedPolicyId(activePolicies[0].id);
          setSelectedPolicy(activePolicies[0]);
        }
      } catch (err) {
        console.error('Error fetching policies:', err);
      } finally {
        setLoadingPolicies(false);
      }
    };
    fetchPolicies();
  }, [user]);

  // Update selected policy when selection changes
  useEffect(() => {
    if (selectedPolicyId) {
      const policy = policies.find(p => p.id === selectedPolicyId);
      setSelectedPolicy(policy || null);
    }
  }, [selectedPolicyId, policies]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, file: 'Please upload a PDF or JPG file' }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setErrors(prev => ({ ...prev, file: 'File size must be less than 10MB' }));
      return;
    }
    setUploadedFile(file);
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.file;
      return newErrors;
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.holderName.trim()) {
      newErrors.holderName = 'Certificate Holder Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email for Delivery is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!user) {
      setErrorMessage('You must be signed in to submit a COI request.');
      setShowErrorModal(true);
      return;
    }

    setSubmitting(true);
    setBackendWarning(false);
    
    try {
      const { coiRequest, backendResponse } = await submitCoiRequest(
        user.id,
        selectedPolicyId,
        selectedPolicy?.segment || null,
        formData,
        uploadedFile
      );

      setSubmittedRequestNumber(coiRequest.request_number);
      
      // Check if backend notification had a warning
      if (backendResponse?.warning) {
        setBackendWarning(true);
      }

      setShowSuccessModal(true);
    } catch (err: any) {
      console.error('COI submission error:', err);
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
      setShowErrorModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    onBack();
  };

  const handleCopyRequestNumber = () => {
    navigator.clipboard.writeText(submittedRequestNumber);
    setCopiedRequestNumber(true);
    setTimeout(() => setCopiedRequestNumber(false), 2000);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Services</span>
      </button>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#F7941D] to-[#E07D0D] rounded-2xl mb-4 shadow-lg">
          <FileText className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Request a Certificate</h1>
        <p className="text-gray-500">We usually process these in &lt; 5 minutes.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Policy Selector (if user has multiple policies) */}
        {!loadingPolicies && policies.length > 1 && (
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#1B3A5F]" />
                Select Policy
              </CardTitle>
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

        {/* Policy info banner */}
        {selectedPolicy && (
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <span className="font-medium">Policy:</span> {selectedPolicy.policy_number} — {selectedPolicy.business_name}
              <span className="text-blue-500 ml-2">({selectedPolicy.carrier})</span>
            </div>
          </div>
        )}

        {/* No policy warning */}
        {!loadingPolicies && policies.length === 0 && (
          <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700">
              No active policy found. You can still submit a COI request and our team will process it.
            </p>
          </div>
        )}

        {/* Section 1: Holder Details */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#1B3A5F]" />
              Holder Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Certificate Holder Name */}
            <div className="space-y-2">
              <Label htmlFor="holderName" className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                Certificate Holder Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="holderName"
                placeholder="Enter company or individual name"
                value={formData.holderName}
                onChange={(e) => handleInputChange('holderName', e.target.value)}
                className={`border-gray-200 focus:ring-[#F7941D] focus:border-[#F7941D] ${errors.holderName ? 'border-red-500' : ''}`}
              />
              {errors.holderName && (
                <p className="text-sm text-red-500">{errors.holderName}</p>
              )}
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                Address
              </Label>
              <Input
                id="address"
                placeholder="Street address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="border-gray-200 focus:ring-[#F7941D] focus:border-[#F7941D]"
              />
            </div>

            {/* City, State, Zip Row */}
            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-3 space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="border-gray-200 focus:ring-[#F7941D] focus:border-[#F7941D]"
                />
              </div>
              <div className="col-span-1 space-y-2">
                <Label htmlFor="state">State</Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) => handleInputChange('state', value)}
                >
                  <SelectTrigger className="border-gray-200 focus:ring-[#F7941D] focus:border-[#F7941D]">
                    <SelectValue placeholder="--" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {US_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="zip">Zip</Label>
                <Input
                  id="zip"
                  placeholder="Zip code"
                  value={formData.zip}
                  onChange={(e) => handleInputChange('zip', e.target.value)}
                  className="border-gray-200 focus:ring-[#F7941D] focus:border-[#F7941D]"
                />
              </div>
            </div>

            {/* Email for Delivery */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                Email for Delivery <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="email@company.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`border-gray-200 focus:ring-[#F7941D] focus:border-[#F7941D] ${errors.email ? 'border-red-500' : ''}`}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
              <p className="text-xs text-gray-400">
                The certificate will be delivered to this email address
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Type of COI */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#1B3A5F]" />
              Type of COI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="certificateType">Certificate Type</Label>
              <Select
                value={formData.certificateType}
                onValueChange={(value) => handleInputChange('certificateType', value)}
              >
                <SelectTrigger className="border-gray-200 focus:ring-[#F7941D] focus:border-[#F7941D]">
                  <SelectValue placeholder="Select certificate type..." />
                </SelectTrigger>
                <SelectContent>
                  {CERTIFICATE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Requirements Upload */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#1B3A5F]" />
              The Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Label>Upload Sample Cert or Requirements (PDF/JPG)</Label>
              
              {/* Upload Zone */}
              <div
                className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer
                  ${dragActive 
                    ? 'border-[#F7941D] bg-orange-50' 
                    : uploadedFile 
                      ? 'border-green-400 bg-green-50' 
                      : 'border-gray-300 hover:border-[#F7941D] hover:bg-orange-50/50'
                  }
                  ${errors.file ? 'border-red-400 bg-red-50' : ''}
                `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                
                {uploadedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FileUp className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-800 truncate max-w-[200px]">
                        {uploadedFile.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(uploadedFile.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile();
                      }}
                      className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
                      <Upload className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-600 font-medium mb-1">
                      Drag & drop your file here
                    </p>
                    <p className="text-sm text-gray-400">
                      or click to browse (PDF, JPG up to 10MB)
                    </p>
                  </>
                )}
              </div>
              
              {errors.file && (
                <p className="text-sm text-red-500">{errors.file}</p>
              )}
              
              {/* AI Note */}
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <Bot className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-700">
                  <span className="font-medium">AI-Powered:</span> Our AI will read this file to match limits exactly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Additional Insureds */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#1B3A5F]" />
              Additional Insureds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="additionalInstructions">
                Additional Insured Language / Special Instructions
              </Label>
              <Textarea
                id="additionalInstructions"
                placeholder="Enter any additional insured language, endorsements, or special instructions here..."
                rows={6}
                value={formData.additionalInstructions}
                onChange={(e) => handleInputChange('additionalInstructions', e.target.value)}
                className="border-gray-200 resize-none focus:ring-[#F7941D] focus:border-[#F7941D]"
              />
              <p className="text-xs text-gray-400">
                Include any specific wording requirements, additional insureds, or special endorsements needed
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={submitting}
          className="w-full h-14 bg-[#F7941D] hover:bg-[#E07D0D] text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              Submit Request
            </>
          )}
        </Button>
      </form>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <DialogTitle className="text-xl font-bold text-gray-800">
              Request Sent!
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2" asChild>
              <div>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Bot className="w-5 h-5 text-[#F7941D]" />
                  <span>Our robots are generating your cert now.</span>
                </div>
                
                {/* Request Number */}
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <p className="text-xs text-gray-500 mb-1">Request Number</p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="text-sm font-mono font-bold text-[#1B3A5F]">
                      {submittedRequestNumber}
                    </code>
                    <button
                      onClick={handleCopyRequestNumber}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      {copiedRequestNumber ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {backendWarning && (
                  <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200 mb-3">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700">
                      Request saved. Our team will process it shortly.
                    </p>
                  </div>
                )}

                <p className="text-sm">
                  You'll receive your certificate at <strong>{formData.email}</strong> shortly.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Button
              onClick={handleCloseSuccessModal}
              className="w-full bg-[#F7941D] hover:bg-[#E07D0D]"
            >
              Back to Services
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error Modal */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <DialogTitle className="text-xl font-bold text-gray-800">
              Submission Error
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              {errorMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Button
              onClick={() => setShowErrorModal(false)}
              className="w-full bg-gray-600 hover:bg-gray-700"
            >
              Try Again
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RequestCOI;
