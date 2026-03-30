import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  Brain, 
  Upload, 
  FileText, 
  Tag,
  CheckCircle,
  X,
  Loader2,
  BookOpen,
  FileQuestion,
  ClipboardList,
  Shield,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

interface AdminTrainAIProps {
  onBack: () => void;
}

interface UploadedResource {
  id: string;
  resource_type: string;
  document_title: string;
  file_name: string;
  keywords: string;
  created_at: string;
}

const resourceTypeOptions = [
  { value: 'policy_pdf', label: 'Policy PDF', icon: FileText, color: 'bg-blue-100 text-blue-700' },
  { value: 'carrier_claim_guide', label: 'Carrier Claim Guide', icon: ClipboardList, color: 'bg-orange-100 text-orange-700' },
  { value: 'internal_training_manual', label: 'Internal Training Manual', icon: BookOpen, color: 'bg-purple-100 text-purple-700' },
  { value: 'coverage_definitions', label: 'Coverage Definitions', icon: FileQuestion, color: 'bg-green-100 text-green-700' }
];

const AdminTrainAI: React.FC<AdminTrainAIProps> = ({ onBack }) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [resourceType, setResourceType] = useState<string>('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [keywords, setKeywords] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // UI state
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [uploadedResources, setUploadedResources] = useState<UploadedResource[]>([]);
  const [isLoadingResources, setIsLoadingResources] = useState(true);

  // Fetch existing resources on mount
  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const { data, error } = await supabase
        .from('carrier_resources')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setUploadedResources(data || []);
    } catch (err) {
      console.error('Error fetching resources:', err);
    } finally {
      setIsLoadingResources(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
      } else {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a PDF file only.',
          variant: 'destructive'
        });
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
      } else {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a PDF file only.',
          variant: 'destructive'
        });
      }
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSubmit = async () => {
    // Validation
    if (!resourceType) {
      toast({
        title: 'Missing Resource Type',
        description: 'Please select a resource type.',
        variant: 'destructive'
      });
      return;
    }

    if (!documentTitle.trim()) {
      toast({
        title: 'Missing Document Title',
        description: 'Please enter a document title.',
        variant: 'destructive'
      });
      return;
    }

    if (!selectedFile) {
      toast({
        title: 'Missing File',
        description: 'Please upload a PDF file.',
        variant: 'destructive'
      });
      return;
    }

    setIsUploading(true);

    try {
      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedFileName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${resourceType}/${timestamp}_${sanitizedFileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('ai-training-docs')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Save metadata to database
      const { error: dbError } = await supabase
        .from('carrier_resources')
        .insert({
          resource_type: resourceType,
          document_title: documentTitle.trim(),
          file_name: selectedFile.name,
          file_path: filePath,
          file_size: selectedFile.size,
          keywords: keywords.trim(),
          uploaded_by: user?.id
        });

      if (dbError) throw dbError;

      // Show success modal
      setShowSuccessModal(true);

      // Reset form
      setResourceType('');
      setDocumentTitle('');
      setKeywords('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Refresh resources list
      fetchResources();

    } catch (err) {
      console.error('Upload error:', err);
      toast({
        title: 'Upload Failed',
        description: 'There was an error uploading your document. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getResourceTypeLabel = (type: string): string => {
    const option = resourceTypeOptions.find(o => o.value === type);
    return option?.label || type;
  };

  const getResourceTypeColor = (type: string): string => {
    const option = resourceTypeOptions.find(o => o.value === type);
    return option?.color || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onBack} 
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Train the AI</h1>
          <p className="text-sm text-gray-500">Upload brain food for the Policy Assistant</p>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Knowledge Hub</h3>
              <p className="text-sm text-gray-600 mt-1">
                Documents uploaded here become instantly available to the AI Policy Assistant. 
                Upload carrier guides, policy forms, and training materials to improve coverage answers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Form */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#F7941D]" />
            Upload New Resource
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Resource Type Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="resourceType" className="text-sm font-medium text-gray-700">
              Resource Type <span className="text-red-500">*</span>
            </Label>
            <Select value={resourceType} onValueChange={setResourceType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select resource type..." />
              </SelectTrigger>
              <SelectContent>
                {resourceTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon className="w-4 h-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Document Title */}
          <div className="space-y-2">
            <Label htmlFor="documentTitle" className="text-sm font-medium text-gray-700">
              Document Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="documentTitle"
              placeholder="e.g., Travelers GL Definition Sheet"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              className="w-full"
            />
          </div>

          {/* File Upload Zone */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Upload PDF <span className="text-red-500">*</span>
            </Label>
            
            {!selectedFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                  ${isDragging 
                    ? 'border-[#F7941D] bg-orange-50' 
                    : 'border-gray-300 hover:border-[#F7941D] hover:bg-orange-50/50'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-3">
                  <div className={`p-4 rounded-full ${isDragging ? 'bg-orange-100' : 'bg-gray-100'}`}>
                    <Upload className={`w-8 h-8 ${isDragging ? 'text-[#F7941D]' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">
                      {isDragging ? 'Drop your PDF here' : 'Drag & drop your PDF here'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      or click to browse (PDF only, max 25MB)
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <FileText className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 truncate max-w-[200px]">
                        {selectedFile.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={removeFile}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Keywords */}
          <div className="space-y-2">
            <Label htmlFor="keywords" className="text-sm font-medium text-gray-700">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Keywords (Optional)
              </div>
            </Label>
            <Input
              id="keywords"
              placeholder="e.g., plumber, hot work, exclusion, GL"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Separate keywords with commas. These help the AI find this document when answering questions.
            </p>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isUploading}
            className="w-full bg-[#F7941D] hover:bg-[#E8850D] text-white py-6 text-lg font-semibold rounded-xl shadow-lg"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Brain className="w-5 h-5 mr-2" />
                Upload to Knowledge Hub
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Uploads */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#1B3A5F]" />
            Recent Uploads
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingResources ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#F7941D]" />
            </div>
          ) : uploadedResources.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No documents uploaded yet</p>
              <p className="text-sm text-gray-400">Upload your first document above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {uploadedResources.map((resource) => (
                <div 
                  key={resource.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <FileText className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">
                        {resource.document_title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-xs ${getResourceTypeColor(resource.resource_type)}`}>
                          {getResourceTypeLabel(resource.resource_type)}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {new Date(resource.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  {resource.keywords && (
                    <div className="hidden md:flex items-center gap-1">
                      {resource.keywords.split(',').slice(0, 3).map((keyword, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {keyword.trim()}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto p-4 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <DialogTitle className="text-center text-xl">
              Document Uploaded!
            </DialogTitle>
            <DialogDescription className="text-center">
              Your document has been added to the Knowledge Hub. The AI Policy Assistant can now reference this material when answering questions.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <Button
              onClick={() => setShowSuccessModal(false)}
              className="bg-[#1B3A5F] hover:bg-[#152d4a] text-white px-8"
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTrainAI;
