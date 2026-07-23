import React from 'react';
import { Bell, ChevronDown } from 'lucide-react';
import BrandLogo from '@/components/brand/BrandLogo';
import { usePolicySelection } from '@/contexts/PolicySelectionContext';
import { formatPolicyOptionLabel } from '@/lib/resolveDefaultPolicy';

interface HeaderProps {
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  const { policies, selectedPolicyId, setSelectedPolicyId, loading } =
    usePolicySelection();

  const activePolicies = policies.filter(
    (p) => String(p.status || '').toLowerCase() === 'active',
  );
  const switchable = activePolicies.length > 0 ? activePolicies : policies;
  const showSwitcher = switchable.length > 1;

  return (
    <header className="sticky top-0 bg-white border-b border-gray-100 z-30 safe-area-top">
      <div className="flex flex-col items-center justify-center px-4 pt-3 pb-2 max-w-4xl mx-auto">
        <BrandLogo variant="header" />
      </div>

      <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#1B3A5F] to-[#2a4a6f] max-w-4xl mx-auto">
        <div className="flex-1 min-w-0">
          {title && (
            <h1 className="font-semibold text-white text-sm sm:text-base truncate">
              {title}
            </h1>
          )}
          {!loading && showSwitcher && (
            <label className="mt-1 block">
              <span className="sr-only">Select active policy</span>
              <div className="relative">
                <select
                  className="w-full max-w-full appearance-none rounded-md border border-white/25 bg-white/10 py-1 pl-2 pr-7 text-xs text-white truncate focus:border-[#F7941D] focus:outline-none focus:ring-1 focus:ring-[#F7941D]"
                  value={selectedPolicyId || ''}
                  onChange={(e) => setSelectedPolicyId(e.target.value)}
                >
                  {switchable.map((p) => (
                    <option key={p.id} value={p.id} className="text-gray-900">
                      {formatPolicyOptionLabel(p)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/70" />
              </div>
            </label>
          )}
          {!loading && switchable.length === 1 && switchable[0] && (
            <p className="mt-0.5 text-xs text-white/75 truncate">
              {formatPolicyOptionLabel(switchable[0])}
            </p>
          )}
        </div>

        <button
          type="button"
          className="relative shrink-0 p-2 text-white/80 hover:text-[#F7941D] transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#F7941D] rounded-full" />
        </button>
      </div>
    </header>
  );
};

export default Header;
