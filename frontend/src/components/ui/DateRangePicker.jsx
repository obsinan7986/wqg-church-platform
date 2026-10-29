import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, ArrowRight, RotateCcw } from 'lucide-react';
import { useDateSettings } from '../../context/DateSettingsContext';
import DatePicker from './DatePicker';
import { getAddisToday } from '../../utils/dateFormat';
import { toEthiopian, toGregorian } from '../../utils/ethiopianCalendar';

export const DateRangePicker = ({
  startDate,
  endDate,
  onChange,
  label,
  showQuickPresets = true,
  className = '',
  containerClassName = ''
}) => {
  const { currentLang, calendarPref } = useDateSettings();

  // Quick preset options
  const handlePreset = (type) => {
    const todayStr = getAddisToday();
    const [ty, tm, td] = todayStr.split('-').map(Number);
    const ethToday = toEthiopian({ year: ty, month: tm, day: td });

    if (type === 'TODAY') {
      onChange({ startDate: todayStr, endDate: todayStr });
    } else if (type === 'THIS_WEEK') {
      const now = new Date();
      const past7 = new Date(now.getTime() - 6 * 86400000);
      const addis7 = new Date(past7.getTime() + 3 * 3600 * 1000);
      const startStr = `${addis7.getUTCFullYear()}-${String(addis7.getUTCMonth() + 1).padStart(2, '0')}-${String(addis7.getUTCDate()).padStart(2, '0')}`;
      onChange({ startDate: startStr, endDate: todayStr });
    } else if (type === 'THIS_ETH_MONTH') {
      // Meskerem 1 .. today (or end of month)
      const startEth = toGregorian(ethToday.year, ethToday.month, 1);
      const startStr = `${String(startEth.year).padStart(4, '0')}-${String(startEth.month).padStart(2, '0')}-${String(startEth.day).padStart(2, '0')}`;
      onChange({ startDate: startStr, endDate: todayStr });
    } else if (type === 'LAST_30_DAYS') {
      const now = new Date();
      const past30 = new Date(now.getTime() - 30 * 86400000);
      const addis30 = new Date(past30.getTime() + 3 * 3600 * 1000);
      const startStr = `${addis30.getUTCFullYear()}-${String(addis30.getUTCMonth() + 1).padStart(2, '0')}-${String(addis30.getUTCDate()).padStart(2, '0')}`;
      onChange({ startDate: startStr, endDate: todayStr });
    }
  };

  const handleClear = () => {
    onChange({ startDate: '', endDate: '' });
  };

  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-slate-700 font-bold block text-xs">{label}</label>
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] text-royal font-semibold hover:underline flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{currentLang === 'am' ? 'አጽዳ' : currentLang === 'en' ? 'Reset' : 'Haqi'}</span>
            </button>
          )}
        </div>
      )}

      {showQuickPresets && (
        <div className="flex flex-wrap gap-1 text-[11px]">
          <button
            type="button"
            onClick={() => handlePreset('TODAY')}
            className="px-2 py-0.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition"
          >
            {currentLang === 'am' ? 'ዛሬ' : currentLang === 'en' ? 'Today' : 'Har\'a'}
          </button>
          <button
            type="button"
            onClick={() => handlePreset('THIS_WEEK')}
            className="px-2 py-0.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition"
          >
            {currentLang === 'am' ? 'የ 7 ቀን' : currentLang === 'en' ? 'Last 7 Days' : 'Guyyoota 7'}
          </button>
          <button
            type="button"
            onClick={() => handlePreset('THIS_ETH_MONTH')}
            className="px-2 py-0.5 rounded-lg border border-gold-300 bg-gold-50/60 hover:bg-gold-100/60 text-gold-900 font-bold transition"
          >
            🇪🇹 {currentLang === 'am' ? 'የአሁኑ ወር' : currentLang === 'en' ? 'This Eth Month' : 'Ji\'a Ammaa (Eth)'}
          </button>
          <button
            type="button"
            onClick={() => handlePreset('LAST_30_DAYS')}
            className="px-2 py-0.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition"
          >
            {currentLang === 'am' ? 'የ 30 ቀን' : currentLang === 'en' ? '30 Days' : 'Guyyoota 30'}
          </button>
        </div>
      )}

      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${className}`}>
        <DatePicker
          value={startDate}
          onChange={(val) => onChange({ startDate: val, endDate })}
          dateOnly={true}
          placeholder={currentLang === 'am' ? 'የመጀመሪያ ቀን' : currentLang === 'en' ? 'Start date' : 'Guyyaa jalqabaa'}
        />
        <DatePicker
          value={endDate}
          onChange={(val) => onChange({ startDate, endDate: val })}
          dateOnly={true}
          placeholder={currentLang === 'am' ? 'የመጨረሻ ቀን' : currentLang === 'en' ? 'End date' : 'Guyyaa xumuraa'}
        />
      </div>
    </div>
  );
};

export default DateRangePicker;
