import React from 'react';
import { Shield, FileText, MessageCircle, User, PlusCircle } from 'lucide-react';

export type TabType = 'policy' | 'quote' | 'services' | 'chat' | 'profile';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'policy' as TabType, label: 'My Policy', icon: Shield },
    { id: 'quote' as TabType, label: 'Quote', icon: PlusCircle },
    { id: 'services' as TabType, label: 'Services', icon: FileText },
    { id: 'chat' as TabType, label: 'Policy Chat', icon: MessageCircle },
    { id: 'profile' as TabType, label: 'Profile', icon: User },

  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              activeTab === tab.id
                ? 'text-[#F7941D]'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <tab.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${activeTab === tab.id ? 'stroke-[2.5]' : ''}`} />
            <span className={`text-[10px] sm:text-xs mt-1 ${activeTab === tab.id ? 'font-semibold' : ''}`}>
              {tab.label}
            </span>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 w-10 sm:w-12 h-1 bg-[#F7941D] rounded-t-full" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
