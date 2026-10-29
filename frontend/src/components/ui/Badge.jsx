import React from 'react';

const variantStyles = {
  gold: 'bg-gold-tint text-royal border border-gold-500/70',
  royal: 'bg-royal text-white border border-royal-dark',
  blue: 'bg-royal text-white border border-royal-dark',
  muted: 'bg-royal-tint text-slate-700 border border-slate-200',
  slate: 'bg-slate-100 text-slate-700 border border-slate-200',
  danger: 'bg-red-50 text-red-700 border border-red-200',
  outline: 'bg-white text-royal border border-gold-500',
  'solid-gold': 'bg-gold-500 text-royal font-black border border-gold-600'
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs'
};

export const Badge = ({
  children,
  variant = 'gold',
  size = 'md',
  className = '',
  icon: Icon,
  ...props
}) => {
  const variantClass = variantStyles[variant] || variantStyles.gold;
  const sizeClass = sizeStyles[size] || sizeStyles.md;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg font-bold uppercase tracking-wider ${sizeClass} ${variantClass} ${className}`}
      {...props}
    >
      {Icon && <Icon className={size === 'sm' ? 'w-2.5 h-2.5 text-gold-500' : 'w-3.5 h-3.5 text-gold-500'} />}
      {children}
    </span>
  );
};

export default Badge;
