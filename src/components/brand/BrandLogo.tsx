import React from 'react';
import { cn } from '@/lib/utils';

export const CID_LOGO_URL =
  'https://d64gsuwffb70l.cloudfront.net/6924df0368d7442ec1a565a5_1765667401275_db0552a0.png';

type BrandLogoProps = {
  variant?: 'header' | 'login';
  className?: string;
};

/** Logo PNG has generous padding; scale up so the mark reads clearly on mobile. */
const logoImageClasses = {
  header:
    'h-16 sm:h-[4.5rem] md:h-20 w-auto max-w-[min(92vw,20rem)] sm:max-w-[22rem] scale-[1.75] sm:scale-[1.85] md:scale-[1.95] origin-center object-contain',
  login:
    'h-16 sm:h-[4.5rem] w-auto max-w-[min(88vw,18rem)] scale-[1.85] sm:scale-[1.95] origin-center object-contain',
};

const BrandLogo: React.FC<BrandLogoProps> = ({ variant = 'header', className }) => {
  return (
    <div
      className={cn(
        'flex items-center justify-center overflow-visible',
        variant === 'header' && 'min-h-[4.5rem] sm:min-h-[5rem] md:min-h-[5.5rem]',
        variant === 'login' && 'min-h-[4.5rem] sm:min-h-[5rem]',
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
