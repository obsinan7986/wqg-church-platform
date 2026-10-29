import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { useDateSettings } from '../context/DateSettingsContext';

export const DateSettingsBar = ({ variant = 'header', className = '' }) => {
  const {
    calendarPref,
    clockPref,
    setCalendarPref,
    setClockPref,
    currentLang
  } = useDateSettings();

  if (variant === 'menu') {
    return (
      <div className={`space-y-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs ${className}`}>
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-700 flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-royal" />
            <span>{currentLang === 'am' ? 'የቀን መቁጠሪያ' : currentLang === 'en' ? 'Calendar' : 'Kalandara'}</span>
          </span>
          <div className="flex bg-white border border-slate-200 rounded-lg p-0.5 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setCalendarPref('ETHIOPIAN')}
              className={`px-2 py-0.5 rounded-md transition ${
                calendarPref === 'ETHIOPIAN' ? 'bg-royal text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🇪🇹 Eth
            </button>
            <button
              type="button"
              onClick={() => setCalendarPref('GREGORIAN')}
              className={`px-2 py-0.5 rounded-md transition ${
                calendarPref === 'GREGORIAN' ? 'bg-royal text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🌍 Greg
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-700 flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-royal" />
            <span>{currentLang === 'am' ? 'የሰዓት አቆጣጠር' : currentLang === 'en' ? 'Clock' : 'Sa\'aatii'}</span>
          </span>
          <div className="flex bg-white border border-slate-200 rounded-lg p-0.5 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setClockPref('ETHIOPIAN')}
              className={`px-2 py-0.5 rounded-md transition ${
                clockPref === 'ETHIOPIAN' ? 'bg-royal text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🇪🇹 Eth
            </button>
            <button
              type="button"
              onClick={() => setClockPref('INTERNATIONAL')}
              className={`px-2 py-0.5 rounded-md transition ${
                clockPref === 'INTERNATIONAL' ? 'bg-royal text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🌍 24h
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Header compact pills
  return (
    <div className={`flex items-center space-x-1.5 ${className}`}>
      {/* Calendar Switcher Pill */}
      <div
        className="flex items-center bg-royal-dark/90 border border-gold-500/40 rounded-full p-0.5 text-[11px] shadow-xs"
        title="Calendar system (Ethiopian / Gregorian)"
      >
        <button
          type="button"
          onClick={() => setCalendarPref('ETHIOPIAN')}
          className={`px-2 py-0.5 rounded-full transition-all ${
            calendarPref === 'ETHIOPIAN'
              ? 'bg-gold-500 text-royal font-black shadow-xs'
              : 'text-white/80 hover:text-white font-medium'
          }`}
          aria-label="Ethiopian Calendar"
        >
          🇪🇹 ET
        </button>
        <span className="text-white/20 select-none">|</span>
        <button
          type="button"
          onClick={() => setCalendarPref('GREGORIAN')}
          className={`px-2 py-0.5 rounded-full transition-all ${
            calendarPref === 'GREGORIAN'
              ? 'bg-gold-500 text-royal font-black shadow-xs'
              : 'text-white/80 hover:text-white font-medium'
          }`}
          aria-label="Gregorian Calendar"
        >
          🌍 GR
        </button>
      </div>

      {/* Clock Switcher Pill */}
      <div
        className="hidden md:flex items-center bg-royal-dark/90 border border-gold-500/40 rounded-full p-0.5 text-[11px] shadow-xs"
        title="Clock system (Ethiopian / 24h International)"
      >
        <button
          type="button"
          onClick={() => setClockPref('ETHIOPIAN')}
          className={`px-2 py-0.5 rounded-full transition-all ${
            clockPref === 'ETHIOPIAN'
              ? 'bg-gold-500 text-royal font-black shadow-xs'
              : 'text-white/80 hover:text-white font-medium'
          }`}
          aria-label="Ethiopian Clock"
        >
          12h
        </button>
        <span className="text-white/20 select-none">|</span>
        <button
          type="button"
          onClick={() => setClockPref('INTERNATIONAL')}
          className={`px-2 py-0.5 rounded-full transition-all ${
            clockPref === 'INTERNATIONAL'
              ? 'bg-gold-500 text-royal font-black shadow-xs'
              : 'text-white/80 hover:text-white font-medium'
          }`}
          aria-label="International 24h Clock"
        >
          24h
        </button>
      </div>
    </div>
  );
};

export default DateSettingsBar;
