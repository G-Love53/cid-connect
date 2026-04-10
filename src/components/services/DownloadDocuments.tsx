import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  FileText, 
  Download,
  Loader2,
  AlertCircle,
  File,
  FileCheck,
  Calendar,
  Eye,
  FolderOpen,
  RefreshCw,
  CheckCircle2,
  Megaphone,
  BookOpen,
  ListChecks,
  FileQuestion,
  GraduationCap,
  Building2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Policy, Document, CarrierResource } from '@/types';
import { toast } from '@/components/ui/use-toast';
import { 
  getUserDocuments,
  getActivePolicyForUser,
  getDownloadUrl, 
  downloadDocumentFile,
  getCarrierResources,
  getCarrierResourceDownloadUrl,
  downloadCarrierResource
} from '@/api';

interface DownloadDocumentsProps {
  onBack: () => void;
}

const DownloadDocuments: React.FC<DownloadDocumentsProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [carrierResources, setCarrierResources] = useState<CarrierResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [resourcesExpanded, setResourcesExpanded] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      const policyData = await getActivePolicyForUser(user.id);
      if (policyData) {
        setPolicy(policyData);
        const resources = await getCarrierResources(policyData.carrier, policyData.segment);
        setCarrierResources(resources);
      }

      // Fetch documents from the documents table
      const userDocuments = await getUserDocuments(user.id);
      setDocuments(userDocuments);

    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast({
      title: 'Documents Refreshed',
      description: 'Your document list has been updated.'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = async (doc: Document) => {
    setDownloading(doc.id);
    
    try {
      // Generate signed URL and trigger download
      const success = await downloadDocumentFile(doc.file_path, doc.name);
      
      if (success) {
        // Log download activity
        await supabase
          .from('document_downloads')
          .insert({
            user_id: user?.id,
            policy_id: doc.policy_id,
            document_type: doc.type,
            document_name: doc.name
          });

        toast({
          title: 'Download Started',
          description: `${doc.name} is being downloaded`
        });
      } else {
        throw new Error('Failed to generate download URL');
      }
      
    } catch (err: any) {
      console.error('Error downloading document:', err);
      toast({
        title: 'Download Failed',
        description: 'Unable to download document. The file may not exist or the link has expired.',
        variant: 'destructive'
      });
    } finally {
      setDownloading(null);
    }
  };

  const handleViewDocument = async (doc: Document) => {
    try {
      // Generate signed URL for viewing
      const signedUrl = await getDownloadUrl(doc.file_path);
      
      if (signedUrl) {
        // Open in new tab for viewing
        window.open(signedUrl, '_blank');
        toast({
          title: 'Opening Document',
          description: `Opening ${doc.name} in a new tab...`
        });
      } else {
        throw new Error('Failed to generate view URL');
      }
    } catch (err) {
      console.error('Error viewing document:', err);
      toast({
        title: 'View Failed',
        description: 'Unable to open document. Please try downloading instead.',
        variant: 'destructive'
      });
    }
  };

  const handleDownloadResource = async (resource: CarrierResource) => {
    setDownloading(resource.id);
    
    try {
      const success = await downloadCarrierResource(resource.file_path, resource.name);
      
      if (success) {
        toast({
          title: 'Download Started',
          description: `${resource.name} is being downloaded`
        });
      } else {
        throw new Error('Failed to generate download URL');
      }
    } catch (err: any) {
      console.error('Error downloading resource:', err);
      toast({
        title: 'Download Failed',
        description: 'Unable to download resource. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setDownloading(null);
    }
  };

  const handleViewResource = async (resource: CarrierResource) => {
    try {
      const signedUrl = await getCarrierResourceDownloadUrl(resource.file_path);
      
      if (signedUrl) {
        window.open(signedUrl, '_blank');
        toast({
          title: 'Opening Resource',
          description: `Opening ${resource.name} in a new tab...`
        });
      } else {
        throw new Error('Failed to generate view URL');
      }
    } catch (err) {
      console.error('Error viewing resource:', err);
      toast({
        title: 'View Failed',
        description: 'Unable to open resource. Please try downloading instead.',
        variant: 'destructive'
      });
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'declaration':
        return <FileCheck className="w-5 h-5" />;
      case 'policy':
        return <FileText className="w-5 h-5" />;
      case 'coi':
      case 'certificate':
        return <File className="w-5 h-5" />;
      case 'invoice':
        return <FileText className="w-5 h-5" />;
      default:
        return <File className="w-5 h-5" />;
    }
  };

  const getResourceTypeIcon = (type: string) => {
    switch (type) {
      case 'Marketing':
        return <Megaphone className="w-5 h-5" />;
      case 'Definitions':
        return <BookOpen className="w-5 h-5" />;
      case 'Step-by-Step Guides':
        return <ListChecks className="w-5 h-5" />;
      case 'Forms':
        return <FileText className="w-5 h-5" />;
      case 'Training':
        return <GraduationCap className="w-5 h-5" />;
      default:
        return <FileQuestion className="w-5 h-5" />;
    }
  };

  const getResourceTypeColor = (type: string) => {
    switch (type) {
      case 'Marketing':
        return 'bg-purple-50 text-purple-600';
      case 'Definitions':
        return 'bg-blue-50 text-blue-600';
      case 'Step-by-Step Guides':
        return 'bg-green-50 text-green-600';
      case 'Forms':
        return 'bg-amber-50 text-amber-600';
      case 'Training':
        return 'bg-indigo-50 text-indigo-600';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'declaration': 'Declaration Page',
      'policy': 'Policy Document',
      'coi': 'Certificate of Insurance',
      'certificate': 'Certificate',
      'invoice': 'Invoice',
      'id_card': 'ID Card',
      'endorsement': 'Endorsement',
      'renewal': 'Renewal Notice'
    };
    return labels[type.toLowerCase()] || type;
  };

  // Group carrier resources by type
  const groupedResources = carrierResources.reduce((acc, resource) => {
    const type = resource.resource_type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(resource);
    return acc;
  }, {} as Record<string, CarrierResource[]>);

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
            <span className="ml-2 text-gray-600">Loading documents...</span>
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

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1B3A5F]/10 rounded-lg">
            <FileText className="w-6 h-6 text-[#1B3A5F]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Policy Documents</h1>
            <p className="text-sm text-gray-500">Download your insurance documents</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-[#1B3A5F] border-[#1B3A5F]/30"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {!policy ? (
        <Card className="border-0 shadow-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No active policy found.</p>
            <p className="text-sm text-gray-400 mt-1">
              Get a quote and bind a policy to access your documents.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Policy Reference */}
          <Card className="border-0 shadow-md bg-gradient-to-br from-[#1B3A5F] to-[#2C5282] text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Policy</p>
                  <p className="font-semibold">{policy.policy_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm opacity-80">Business</p>
                  <p className="font-medium">{policy.business_name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Policy Documents */}
          {documents.length === 0 ? (
            <Card className="border-0 shadow-md">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Documents Found</h3>
                <p className="text-gray-500 mb-4">
                  You don't have any documents available for download yet.
                </p>
                <p className="text-sm text-gray-400">
                  Documents will appear here once they are generated for your policy.
                  This may include your policy declaration, certificates of insurance, and invoices.
                </p>
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  className="mt-4 text-[#F7941D] border-[#F7941D] hover:bg-[#F7941D]/10"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Check for New Documents
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Your Policy Documents</CardTitle>
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {documents.length} {documents.length === 1 ? 'document' : 'documents'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-gray-100">
                  {documents.map((doc) => (
                    <div 
                      key={doc.id}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-orange-50 rounded-lg text-[#F7941D]">
                          {getDocumentIcon(doc.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-800">{doc.name}</h3>
                          <p className="text-sm text-gray-500 mb-1">
                            {doc.description || getDocumentTypeLabel(doc.type)}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(doc.created_at)}
                            </span>
                            <span>{formatFileSize(doc.file_size)}</span>
                            {doc.mime_type && (
                              <span className="uppercase">
                                {doc.mime_type.split('/')[1] || 'PDF'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDocument(doc)}
                            className="text-[#1B3A5F] border-[#1B3A5F]/30 hover:bg-[#1B3A5F]/10"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleDownload(doc)}
                            disabled={downloading === doc.id}
                            className="bg-[#F7941D] hover:bg-[#E07D0D]"
                          >
                            {downloading === doc.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Download All Button */}
              {documents.length > 1 && (
                <Button
                  onClick={async () => {
                    toast({
                      title: 'Downloading All Documents',
                      description: 'Starting downloads for all documents...'
                    });
                    
                    // Download each document sequentially
                    for (const doc of documents) {
                      await handleDownload(doc);
                      // Small delay between downloads
                      await new Promise(resolve => setTimeout(resolve, 500));
                    }
                  }}
                  variant="outline"
                  className="w-full h-12 border-[#1B3A5F] text-[#1B3A5F] hover:bg-[#1B3A5F]/10"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download All Documents ({documents.length})
                </Button>
              )}
            </>
          )}

          {/* Carrier Resources Section */}
          {carrierResources.length > 0 && (
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <button 
                  onClick={() => setResourcesExpanded(!resourcesExpanded)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#1B3A5F]/10 rounded-lg">
                      <Building2 className="w-5 h-5 text-[#1B3A5F]" />
                    </div>
                    <div className="text-left">
                      <CardTitle className="text-base">Carrier Resources</CardTitle>
                      <p className="text-sm text-gray-500 font-normal">
                        Educational materials from {policy.carrier}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {carrierResources.length} {carrierResources.length === 1 ? 'resource' : 'resources'}
                    </span>
                    {resourcesExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>
              </CardHeader>
              
              {resourcesExpanded && (
                <CardContent className="pt-2">
                  {/* Group by resource type */}
                  {Object.entries(groupedResources).map(([type, resources]) => (
                    <div key={type} className="mb-4 last:mb-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1.5 rounded ${getResourceTypeColor(type)}`}>
                          {getResourceTypeIcon(type)}
                        </div>
                        <h4 className="font-medium text-gray-700">{type}</h4>
                        <span className="text-xs text-gray-400">({resources.length})</span>
                      </div>
                      
                      <div className="space-y-2 ml-9">
                        {resources.map((resource) => (
                          <div 
                            key={resource.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex-1 min-w-0 mr-4">
                              <h5 className="font-medium text-gray-800 text-sm truncate">
                                {resource.name}
                              </h5>
                              {resource.description && (
                                <p className="text-xs text-gray-500 truncate">
                                  {resource.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                                <span>{formatFileSize(resource.file_size)}</span>
                                <span className="uppercase">
                                  {resource.mime_type?.split('/')[1] || 'PDF'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewResource(resource)}
                                className="text-[#1B3A5F] hover:bg-[#1B3A5F]/10"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleDownloadResource(resource)}
                                disabled={downloading === resource.id}
                                className="bg-[#1B3A5F] hover:bg-[#2C5282]"
                              >
                                {downloading === resource.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Download className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          )}

          {/* No Carrier Resources Message */}
          {carrierResources.length === 0 && documents.length > 0 && (
            <Card className="border-0 shadow-md bg-gray-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-200 rounded-lg">
                    <Building2 className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700">Carrier Resources</h4>
                    <p className="text-sm text-gray-500">
                      No carrier resources are currently available for your policy segment.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Success indicator when documents exist */}
          {documents.length > 0 && (
            <div className="flex items-center justify-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
              <span>All documents are securely stored and ready for download</span>
            </div>
          )}

          {/* Help Text */}
          <p className="text-xs text-gray-400 text-center">
            Documents are available in PDF format. Download links expire after 60 seconds for security.
            Contact support if you need documents in a different format.
          </p>
        </>
      )}
    </div>
  );
};

export default DownloadDocuments;
