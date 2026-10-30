import React from 'react';
import Card from './Card';

export const StatCard = ({
  icon: Icon,
  label,
  value,
  subtext,
  trend,
  badge,
  goldValue = false,
  className = '',
  onClick,
  ...props
}) => {
  return (
    <Card
      onClick={onClick}
      className={`relative overflow-hidden flex flex-col justify-between ${onClick ? 'cursor-pointer' : ''} ${className}`}
      {...props}
    >
      <div className="flex items-start sm:items-center justify-between text-slate-500 text-xs font-bold gap-2">
        <span className="line-clamp-2 leading-tight">{label}</span>
        {Icon && (
          <div className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-xl bg-royal-tint border border-gold-500/30 flex items-center justify-center text-gold-600">
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        )}
      </div>

      <div className={`text-xl sm:text-3xl font-black mt-2 sm:mt-3 break-words ${goldValue ? 'text-gold-600' : 'text-royal'}`}>
        {value}
      </div>

      {(subtext || trend || badge) && (
        <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between text-[10px] sm:text-[11px] text-slate-500 gap-1">
          {subtext && <span className="line-clamp-1">{subtext}</span>}
          {trend && <span className="text-gold-600 font-bold shrink-0">{trend}</span>}
          {badge}
        </div>
      )}
    </Card>
  );
};

export default StatCard;