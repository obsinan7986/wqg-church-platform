import React from 'react';

export const Card = ({
  children,
  className = '',
  hoverEffect = true,
  noPadding = false,
  onClick,
  ...props
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200 rounded-2xl ${
        noPadding ? 'p-0' : 'p-5 sm:p-6'
      } shadow-sm ${
        hoverEffect ? 'hover:border-gold-500/70 hover:shadow-md transition-all duration-200' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '', ...props }) => (
  <div className={`pb-4 border-b border-slate-200 mb-4 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '', ...props }) => (
  <h3 className={`text-base sm:text-lg font-bold text-royal ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription = ({ children, className = '', ...props }) => (
  <p className={`text-xs sm:text-sm text-slate-600 mt-1 ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent = ({ children, className = '', ...props }) => (
  <div className={`space-y-4 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '', ...props }) => (
  <div className={`pt-4 border-t border-slate-200 mt-4 flex items-center justify-between ${className}`} {...props}>
    {children}
  </div>
);

export default Card;
