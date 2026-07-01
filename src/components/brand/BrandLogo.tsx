import React from 'react';
import { cn } from '@/lib/utils';

/** Tight-cropped nav mark (no PNG whitespace padding). */
export const CID_LOGO_URL = '/logo-nav.png';

type BrandLogoProps = {
  variant?: 'header' | 'login';
  className?: string;
};

const logoImageClasses = {
  header:
    'h-12 sm:h-14 md:h-16 w-auto max-w-[min(92vw,20rem)] sm:max-w-[22rem] object-contain',
  login:
    'h-12 sm:h-14 w-auto max-w-[min(88vw,18rem)] object-contain',
};

const BrandLogo: React.FC<BrandLogoProps> = ({ variant = 'header', className }) => {
  return (
    <div
      className={cn(
        'flex items-center justify-center',
        variant === 'header' && 'py-2 min-h-[3.5rem] sm:min-h-[4rem] md:min-h-[4.5rem]',
        variant === 'login' && 'py-2 min-h-[3.5rem] sm:min-h-[4rem]',
        className,
      )}
    >
      <img
        src={CID_LOGO_URL}
        alt="Commercial Insurance Direct"
        className={logoImageClasses[variant]}
      />
    </div>
  );
};

export default BrandLogo;
