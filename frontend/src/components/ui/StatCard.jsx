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
      <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
        <span>{label}</span>
        {Icon && (
          <div className="w-8 h-8 rounded-xl bg-royal-tint border border-gold-500/30 flex items-center justify-center text-gold-600">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className={`text-2xl sm:text-3xl font-black mt-3 ${goldValue ? 'text-gold-600' : 'text-royal'}`}>
        {value}
      </div>

      {(subtext || trend || badge) && (
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
          {subtext && <span>{subtext}</span>}
          {trend && <span className="text-gold-600 font-bold">{trend}</span>}
          {badge}
        </div>
      )}
    </Card>
  );
};

export default StatCard;