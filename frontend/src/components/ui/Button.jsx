import React from 'react';
import Spinner from './Spinner';

const variantStyles = {
  primary: 'bg-royal hover:bg-royal-dark text-white font-bold shadow-sm shadow-royal/20 active:scale-[0.98]',
  gold: 'bg-gold hover:bg-gold-dark text-royal font-black shadow-sm active:scale-[0.98]',
  secondary: 'bg-white border border-royal text-royal hover:bg-royal-tint active:scale-[0.98]',
  outline: 'bg-white border border-royal text-royal hover:bg-royal-tint active:scale-[0.98]',
  ghost: 'text-slate-700 hover:text-royal hover:bg-royal-tint border border-transparent active:scale-[0.98]',
  danger: 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 active:scale-[0.98]'
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-xs rounded-xl gap-1.5 min-h-[38px] sm:min-h-[34px]',
  md: 'px-4 py-2.5 text-xs sm:text-sm rounded-xl gap-2 min-h-[44px]',
  lg: 'px-6 py-3.5 text-sm sm:text-base rounded-2xl gap-2.5 min-h-[48px]'
};

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  onClick,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-royal focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none';
  const variantClass = variantStyles[variant] || variantStyles.primary;
  const sizeClass = sizeStyles[size] || sizeStyles.md;
  const widthClass = fullWidth ? 'w-full' : '';

  const ariaLabel = props['aria-label'] || (!children && typeof props.title === 'string' ? props.title : undefined);

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      aria-label={ariaLabel}
      className={`${baseClasses} ${variantClass} ${sizeClass} ${widthClass} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Spinner size={size === 'lg' ? 'md' : 'sm'} variant={variant === 'primary' ? 'white' : 'royal'} />
          <span>{children}</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className={`shrink-0 ${size === 'lg' ? 'w-5 h-5' : size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />}
          {children && <span>{children}</span>}
          {Icon && iconPosition === 'right' && <Icon className={`shrink-0 ${size === 'lg' ? 'w-5 h-5' : size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />}
        </>
      )}
    </button>
  );
};

export default Button;
