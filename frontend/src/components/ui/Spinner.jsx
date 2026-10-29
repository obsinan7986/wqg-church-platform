import React from 'react';

const sizeMap = {
  sm: 'w-3.5 h-3.5',
  md: 'w-5 h-5',
  lg: 'w-8 h-8'
};

const variantMap = {
  royal: 'text-royal',
  gold: 'text-gold-500',
  white: 'text-white',
  slate: 'text-slate-400'
};

export const Spinner = ({ size = 'md', variant = 'royal', className = '' }) => {
  const sizeClass = sizeMap[size] || sizeMap.md;
  const colorClass = variantMap[variant] || variantMap.royal;

  return (
    <svg
      className={`animate-spin ${sizeClass} ${colorClass} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
};

export default Spinner;