import React, { useEffect, useState } from 'react';
import { COOP_LOGO_SRC } from '../constants/brand';

interface BrandLogoProps {
  logoUrl?: string;
  className?: string;
}

/** Logo from the Settings sheet (logoUrl), falling back to the bundled emblem if empty or broken. */
export const BrandLogo: React.FC<BrandLogoProps> = ({ logoUrl, className = '' }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [logoUrl]);
  const src = logoUrl && !failed ? logoUrl : COOP_LOGO_SRC;
  return (
    <img
      src={src}
      alt="โลโก้สหกรณ์"
      onError={() => setFailed(true)}
      className={`rounded-full object-contain bg-white ${className}`}
    />
  );
};
