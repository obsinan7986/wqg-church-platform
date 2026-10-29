import React from 'react';

export const Skeleton = ({
  variant = 'text',
  className = '',
  ...props
}) => {
  const variantStyles = {
    text: 'h-4 w-full rounded-md',
    circular: 'rounded-full',
    rectangular: 'w-full rounded-xl'
  };

  return (
    <div
      className={`animate-pulse bg-slate-200 ${variantStyles[variant] || variantStyles.text} ${className}`}
      {...props}
    />
  );
};

export default Skeleton;