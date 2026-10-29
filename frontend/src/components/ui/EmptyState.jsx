import React from 'react';
import { Sparkles } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = Sparkles,
  title = 'Wanti tokkollee hin argamne',
  description = 'Gabaasni ykn daataan barbaaddan yeroof hin jiru.',
  action,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`p-10 sm:p-14 text-center rounded-2xl bg-royal-tint/40 border border-slate-200 flex flex-col items-center justify-center space-y-3 ${className}`}
      {...props}
    >
      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-400">
        {Icon && <Icon className="w-6 h-6 text-gold-600" />}
      </div>
      <h4 className="text-sm sm:text-base font-bold text-royal max-w-sm">
        {title}
      </h4>
      {description && (
        <p className="text-xs text-slate-500 max-w-md leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};

export default EmptyState;