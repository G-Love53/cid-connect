import React, { useRef, useEffect, useState } from 'react';
import { Segment } from '@/types';
import { getDistinctSegments } from '@/api';
import { ChevronDown, Wrench, Home, Wine, Check, Zap, Thermometer, UtensilsCrossed, Car, Trees, Shield, Loader2 } from 'lucide-react';


interface SegmentSelectorProps {
  selectedSegment: Segment | null;
  onSelect: (segment: Segment) => void;
}

const getSegmentIcon = (iconName: string) => {
  const iconProps = { className: "w-6 h-6" };
  
  switch (iconName) {
    case 'wrench':
      return <Wrench {...iconProps} />;
    case 'home':
      return <Home {...iconProps} />;
    case 'wine':
      return <Wine {...iconProps} />;
    case 'zap':
      return <Zap {...iconProps} />;
    case 'thermometer':
      return <Thermometer {...iconProps} />;
    case 'utensils':
      return <UtensilsCrossed {...iconProps} />;
    case 'car':
      return <Car {...iconProps} />;
    case 'trees':
      return <Trees {...iconProps} />;
    default:
      return <Wrench {...iconProps} />;
  }
};

const SegmentSelector: React.FC<SegmentSelectorProps> = ({ selectedSegment, onSelect }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loadingSegments, setLoadingSegments] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch segments dynamically from the database
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getDistinctSegments();
        if (!cancelled) setSegments(data);
      } catch (err) {
        console.error('Error fetching segments:', err);
      } finally {
        if (!cancelled) setLoadingSegments(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="w-full" ref={dropdownRef}>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        Select Insurance Segment
      </label>
      
      <div className="relative">
        {/* Dropdown Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-white border-2 border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-[#F7941D] transition-all focus:outline-none focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
        >
          {selectedSegment ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#F7941D] to-[#FDB54E] rounded-lg flex items-center justify-center text-white">
                {getSegmentIcon(selectedSegment.icon)}
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-800">{selectedSegment.name}</p>
                <p className="text-sm text-gray-500">{selectedSegment.description}</p>
              </div>
            </div>
          ) : (
            <span className="text-gray-400">
              {loadingSegments ? 'Loading segments...' : 'Choose a segment...'}
            </span>
          )}
          {loadingSegments ? (
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          ) : (
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          )}
        </button>

        {/* Dropdown Menu */}
        {isOpen && !loadingSegments && (
          <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-80 overflow-y-auto transition-all duration-200">
            {segments.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No segments found in the database.
              </div>
            ) : (
              segments.map((segment) => (
                <button
                  key={segment.id}
                  type="button"
                  onClick={() => {
                    onSelect(segment);
                    setIsOpen(false);
                  }}
                  className={`w-full p-4 flex items-center gap-3 hover:bg-orange-50 transition-colors ${
                    selectedSegment?.id === segment.id ? 'bg-orange-50' : ''
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    selectedSegment?.id === segment.id 
                      ? 'bg-gradient-to-br from-[#F7941D] to-[#FDB54E] text-white' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {getSegmentIcon(segment.icon)}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{segment.name}</p>
                    <p className="text-sm text-gray-500 truncate">{segment.description}</p>
                  </div>
                  {selectedSegment?.id === segment.id && (
                    <Check className="w-5 h-5 text-[#F7941D] flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SegmentSelector;
