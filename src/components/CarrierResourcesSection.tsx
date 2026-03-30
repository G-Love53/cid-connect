import React, { useState, useEffect } from 'react';
import { CarrierResource } from '@/types';
import { getCarrierResources, downloadCarrierResource } from '@/api';
import { Download, FileText, BookOpen, GraduationCap, ClipboardList, Megaphone, FolderOpen, Loader2, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CarrierResourcesSectionProps {
  carrierName: string;
  segment: string;
  availableSegments?: string[];
}

const RESOURCE_TYPE_ICONS: Record<string, React.ReactNode> = {
  'Marketing': <Megaphone className="w-4 h-4" />,
  'Definitions': <BookOpen className="w-4 h-4" />,
  'Step-by-Step Guides': <ClipboardList className="w-4 h-4" />,
  'Forms': <FileText className="w-4 h-4" />,
  'Training': <GraduationCap className="w-4 h-4" />,
  'Other': <FolderOpen className="w-4 h-4" />,
};

const RESOURCE_TYPE_COLORS: Record<string, string> = {
  'Marketing': 'bg-purple-50 text-purple-700 border-purple-200',
  'Definitions': 'bg-blue-50 text-blue-700 border-blue-200',
  'Step-by-Step Guides': 'bg-green-50 text-green-700 border-green-200',
  'Forms': 'bg-orange-50 text-orange-700 border-orange-200',
  'Training': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Other': 'bg-gray-50 text-gray-700 border-gray-200',
};

const CarrierResourcesSection: React.FC<CarrierResourcesSectionProps> = ({
  carrierName,
  segment: initialSegment,
  availableSegments,
}) => {
  const [resources, setResources] = useState<CarrierResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [activeSegment, setActiveSegment] = useState(initialSegment);
  const [segmentDropdownOpen, setSegmentDropdownOpen] = useState(false);

  useEffect(() => {
    fetchResources();
  }, [carrierName, activeSegment]);

  const fetchResources = async () => {
    setLoading(true);
    const data = await getCarrierResources(carrierName, activeSegment);
    setResources(data);
    setLoading(false);
  };

  const handleDownload = async (resource: CarrierResource) => {
    setDownloading(resource.id);
    try {
      const success = await downloadCarrierResource(resource.file_path, resource.name);
      if (!success) {
        console.error('Failed to download resource:', resource.name);
      }
    } catch (err) {
      console.error('Download error:', err);
    }
    setDownloading(null);
  };

  // Group resources by type
  const grouped = resources.reduce<Record<string, CarrierResource[]>>((acc, r) => {
    const type = r.resource_type || 'Other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(r);
    return acc;
  }, {});

  const segments = availableSegments && availableSegments.length > 1 ? availableSegments : null;

  if (loading) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-[#F7941D]" />
            Carrier Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-[#F7941D]" />
            <span className="ml-2 text-sm text-gray-500">Loading resources...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (resources.length === 0) {
    return null; // Don't render section if no resources
  }

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-[#F7941D]" />
            Carrier Resources
          </CardTitle>
          <Badge className="bg-gray-100 text-gray-600 border-0">
            {resources.length} file{resources.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Segment selector (if multiple segments) */}
        {segments && (
          <div className="relative mt-3">
            <button
              type="button"
              onClick={() => setSegmentDropdownOpen(!segmentDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors w-full justify-between"
            >
              <span className="capitalize font-medium text-gray-700">{activeSegment}</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${segmentDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {segmentDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                {segments.map((seg) => (
                  <button
                    key={seg}
                    type="button"
                    onClick={() => {
                      setActiveSegment(seg);
                      setSegmentDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm capitalize hover:bg-gray-50 transition-colors ${
                      seg === activeSegment ? 'bg-orange-50 text-[#F7941D] font-semibold' : 'text-gray-700'
                    }`}
                  >
                    {seg}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {Object.entries(grouped).map(([type, items]) => (
          <div key={type}>
            {/* Group header */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${RESOURCE_TYPE_COLORS[type] || RESOURCE_TYPE_COLORS['Other']}`}>
                {RESOURCE_TYPE_ICONS[type] || RESOURCE_TYPE_ICONS['Other']}
                {type}
              </span>
            </div>

            {/* Resource items */}
            <div className="space-y-2">
              {items.map((resource) => (
                <div
                  key={resource.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-medium text-gray-800 truncate">{resource.name}</p>
                    {resource.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{resource.description}</p>
                    )}
                    {resource.file_size && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {(resource.file_size / 1024).toFixed(0)} KB
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownload(resource)}
                    disabled={downloading === resource.id}
                    className="flex-shrink-0 p-2 text-[#F7941D] hover:bg-orange-100 rounded-lg transition-colors disabled:opacity-50"
                    title={`Download ${resource.name}`}
                  >
                    {downloading === resource.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default CarrierResourcesSection;
