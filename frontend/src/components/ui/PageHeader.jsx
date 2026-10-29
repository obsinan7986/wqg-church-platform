import React from 'react';

export const PageHeader = ({
  title,
  subtitle,
  eyebrow,
  icon: Icon,
  actions,
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${className}`}
      {...props}
    >
      <div className="space-y-1.5 max-w-2xl">
        {(eyebrow || Icon) && (
          <div className="flex items-center space-x-2 text-xs text-gold-600 font-bold uppercase tracking-wider">
            {Icon && <Icon className="w-4 h-4 text-gold-600" />}
            {eyebrow && <span>{eyebrow}</span>}
          </div>
        )}
        {title && (
          <h1 className="text-2xl sm:text-3xl font-black text-royal tracking-tight">
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {subtitle}
          </p>
        )}
        {children}
      </div>

      {actions && (
        <div className="flex items-center space-x-3 self-start md:self-auto flex-wrap gap-2">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;