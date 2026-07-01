import React from 'react';
import { Bell } from 'lucide-react';
import BrandLogo from '@/components/brand/BrandLogo';

interface HeaderProps {
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <header className="sticky top-0 bg-white border-b border-gray-100 z-30 safe-area-top">
      {/* Main Logo Section */}
      <div className="flex flex-col items-center justify-center px-4 pt-3 pb-2 max-w-4xl mx-auto">
        <BrandLogo variant="header" />
      </div>
      
      {/* Secondary Bar with Title and Actions */}
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-[#1B3A5F] to-[#2a4a6f] max-w-4xl mx-auto">
        <div className="flex-1">
          {title && (
            <h1 className="font-semibold text-white text-sm sm:text-base">
              {title}
            </h1>
          )}
        </div>
        
        {/* Notification Bell */}
        <button className="relative p-2 text-white/80 hover:text-[#F7941D] transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#F7941D] rounded-full" />
        </button>
      </div>
    </header>
  );
};

export default Header;
