import React from 'react';

export const Tabs = ({
  tabs = [],
  activeTab,
  onChange,
  className = '',
  tabClassName = '',
  ...props
}) => {
  return (
    <div
      className={`flex p-1 rounded-2xl bg-royal-tint border border-slate-200 flex-wrap gap-1 ${className}`}
      role="tablist"
      {...props}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange && onChange(tab.id)}
            className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              isActive
                ? 'bg-royal text-white font-bold shadow-sm'
                : 'text-slate-600 hover:text-royal hover:bg-white'
            } ${tabClassName}`}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            )}
            {tab.badge && <span className="ml-1">{tab.badge}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;