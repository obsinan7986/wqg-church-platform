import React, { useState } from 'react';
import { resolveMediaUrl } from '../../utils/mediaUrl';

/**
 * Avatar component with automatic initials fallback and gold church accent
 */
const Avatar = ({
  user,
  src,
  name,
  size = 'md',
  className = '',
  ring = true,
  isOnline = false,
  alt
}) => {
  const [imgError, setImgError] = useState(false);

  const rawSrc = src || user?.avatarUrl;
  const imageSrc = resolveMediaUrl(rawSrc);
  const displayName = name || user?.fullName || 'Miseensa';

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base font-bold',
    xl: 'w-20 h-20 text-xl font-black',
    '2xl': 'w-24 h-24 text-2xl font-black'
  };

  const selectedSize = sizeClasses[size] || sizeClasses.md;

  // Compute initials: 1 or 2 letters
  const getInitials = (text) => {
    if (!text || typeof text !== 'string') return 'M';
    const parts = text.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const initials = getInitials(displayName);
  const ringClass = ring ? 'border border-gold-400/80 shadow-sm' : '';

  return (
    <div className={`relative inline-flex flex-shrink-0 items-center justify-center rounded-full select-none ${className}`}>
      {imageSrc && !imgError ? (
        <img
          src={imageSrc}
          alt={alt || displayName}
          onError={() => setImgError(true)}
          className={`${selectedSize} rounded-full object-cover bg-royal-tint ${ringClass}`}
        />
      ) : (
        <div
          className={`${selectedSize} rounded-full bg-royal text-gold-300 flex items-center justify-center font-bold tracking-wider ${ringClass}`}
          title={displayName}
        >
          {initials}
        </div>
      )}

      {/* Optional Online status dot */}
      {(isOnline || user?.isOnline) && (
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
      )}
    </div>
  );
};

export default Avatar;
