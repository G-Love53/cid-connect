import React, { useRef, useEffect } from 'react';
import { Segment } from '@/types';
import { SEGMENT_QUOTE_ROUTES } from '@/constants/segmentQuoteRoutes';
import {
  ChevronDown,
  Wrench,
  Home,
  Wine,
  Zap,
  Thermometer,
  UtensilsCrossed,
  Car,
  Trees,
  ExternalLink,
} from 'lucide-react';

function hostForDisplay(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

interface SegmentSelectorProps {
  onSelect: (segment: Segment) => void;
}

const getSegmentIcon = (iconName: string) => {
  const iconProps = { className: 'w-6 h-6' };

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

const SegmentSelector: React.FC<SegmentSelectorProps> = ({ onSelect }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const segments: Segment[] = SEGMENT_QUOTE_ROUTES.map((s) => ({
    id: s.id,
    name: s.name,
    icon: s.icon,
    description: hostForDisplay(s.quoteUrl),
    quoteUrl: s.quoteUrl,
  }));

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
    <div className="w-full relative z-20" ref={dropdownRef}>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        Segment quote form
      </label>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-white border-2 border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-[#F7941D] transition-all focus:outline-none focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
        >
          <span className="text-gray-400">Choose a segment…</span>
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <div className="absolute z-[100] w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-80 overflow-y-auto transition-all duration-200">
            {segments.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No segments configured.</div>
            ) : (
              segments.map((segment) => (
                <button
                  key={segment.id}
                  type="button"
                  onClick={() => {
                    onSelect(segment);
                    setIsOpen(false);
                  }}
                  className="w-full p-4 flex items-center gap-3 hover:bg-orange-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100 text-gray-600">
                    {getSegmentIcon(segment.icon)}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{segment.name}</p>
                    <p className="text-sm text-gray-500 truncate">{segment.description}</p>
                  </div>
                  <ExternalLink className="w-5 h-5 text-gray-400 flex-shrink-0" aria-hidden />
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
