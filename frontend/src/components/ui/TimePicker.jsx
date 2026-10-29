import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Clock as ClockIcon, X } from 'lucide-react';
import { useDateSettings } from '../../context/DateSettingsContext';
import {
  toEthiopianClock,
  fromEthiopianClock,
  formatEthiopianClock
} from '../../utils/ethiopianCalendar';

export const TimePicker = ({
  value, // "HH:mm" or ISO string
  onChange,
  clockType, // 'INTERNATIONAL' | 'ETHIOPIAN'
  onClockTypeChange,
  label,
  error,
  helperText,
  required = false,
  disabled = false,
  className = '',
  containerClassName = '',
  id,
  name,
  placeholder
}) => {
  const { clockPref, currentLang } = useDateSettings();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Active clock system in this picker
  const [activeClock, setActiveClock] = useState(clockType || clockPref || 'INTERNATIONAL');

  useEffect(() => {
    if (clockType) {
      setActiveClock(clockType);
    }
  }, [clockType]);

  // Parse current value into 24-hour hour and minute
  const parsedTime = useMemo(() => {
    if (!value) return null;
    let h = 0;
    let m = 0;

    if (typeof value === 'string') {
      const match = value.match(/(\d{1,2}):(\d{2})/);
      if (match) {
        h = parseInt(match[1], 10);
        m = parseInt(match[2], 10);
      } else {
        const d = new Date(value);
        if (isNaN(d.getTime())) return null;
        // In Addis time
        const addis = new Date(d.getTime() + 3 * 3600 * 1000);
        h = addis.getUTCHours();
        m = addis.getUTCMinutes();
      }
    } else {
      return null;
    }

    const eth = toEthiopianClock(h, m);
    return {
      hour24: h,
      minute: m,
      ethHour: eth.hour,
      ethIsDay: eth.isDay
    };
  }, [value]);

  // Internal state for dropdowns when picker is open
  const [selectedH24, setSelectedH24] = useState(parsedTime ? parsedTime.hour24 : 8);
  const [selectedMin, setSelectedMin] = useState(parsedTime ? parsedTime.minute : 0);
  const [selectedEthHour, setSelectedEthHour] = useState(parsedTime ? parsedTime.ethHour : 2);
  const [selectedEthIsDay, setSelectedEthIsDay] = useState(parsedTime ? parsedTime.ethIsDay : true);

  // Keep state synced when value changes
  useEffect(() => {
    if (parsedTime) {
      setSelectedH24(parsedTime.hour24);
      setSelectedMin(parsedTime.minute);
      setSelectedEthHour(parsedTime.ethHour);
      setSelectedEthIsDay(parsedTime.ethIsDay);
    }
  }, [parsedTime]);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  const handleToggleClock = (targetClock) => {
    setActiveClock(targetClock);
    if (onClockTypeChange) onClockTypeChange(targetClock);
  };

  // Commit time change
  const commitTime = (h24, min) => {
    const hStr = String(h24).padStart(2, '0');
    const mStr = String(min).padStart(2, '0');
    onChange(`${hStr}:${mStr}`);
  };

  const handleSelectInternational = (newH24, newMin) => {
    setSelectedH24(newH24);
    setSelectedMin(newMin);
    const eth = toEthiopianClock(newH24, newMin);
    setSelectedEthHour(eth.hour);
    setSelectedEthIsDay(eth.isDay);
    commitTime(newH24, newMin);
  };

  const handleSelectEthiopian = (newEthHour, newMin, newIsDay) => {
    setSelectedEthHour(newEthHour);
    setSelectedMin(newMin);
    setSelectedEthIsDay(newIsDay);
    const standard = fromEthiopianClock(newEthHour, newMin, newIsDay);
    setSelectedH24(standard.hour);
    commitTime(standard.hour, standard.minute);
  };

  // Formatted display text
  const displayInputText = useMemo(() => {
    if (!parsedTime) return '';
    if (activeClock === 'ETHIOPIAN') {
      return formatEthiopianClock(parsedTime.hour24, parsedTime.minute, currentLang);
    } else {
      const hStr = String(parsedTime.hour24).padStart(2, '0');
      const mStr = String(parsedTime.minute).padStart(2, '0');
      return `${hStr}:${mStr}`;
    }
  }, [parsedTime, activeClock, currentLang]);

  // Secondary text (the other clock)
  const secondaryTimeText = useMemo(() => {
    if (!parsedTime) return null;
    if (activeClock === 'ETHIOPIAN') {
      const hStr = String(parsedTime.hour24).padStart(2, '0');
      const mStr = String(parsedTime.minute).padStart(2, '0');
      return `International (24h): ${hStr}:${mStr}`;
    } else {
      const ethStr = formatEthiopianClock(parsedTime.hour24, parsedTime.minute, currentLang);
      return `Ethiopian Clock: ${ethStr}`;
    }
  }, [parsedTime, activeClock, currentLang]);

  return (
    <div className={`space-y-1 relative ${containerClassName}`} ref={containerRef}>
      {label && (
        <label htmlFor={id || name} className="text-slate-700 font-bold block text-xs">
          {label} {required && <span className="text-gold-600 font-bold">*</span>}
        </label>
      )}

      {/* Button display */}
      <div className="relative">
        <button
          type="button"
          id={id || name}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          className={`w-full bg-white border rounded-xl px-3.5 py-2.5 text-left text-xs sm:text-sm flex items-center justify-between transition-all focus:outline-none focus:border-royal focus-visible:ring-2 focus-visible:ring-royal/20 disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed ${
            error ? 'border-red-500' : 'border-slate-300 hover:border-slate-400'
          } ${className}`}
        >
          <span className={displayInputText ? 'text-slate-900 font-semibold' : 'text-slate-400'}>
            {displayInputText || placeholder || (currentLang === 'am' ? 'ሰዓት ይምረጡ' : currentLang === 'en' ? 'Select time' : 'Sa\'aatii filadhaa')}
          </span>
          <div className="flex items-center space-x-1.5 text-slate-400">
            {value && !required && !disabled && (
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
                className="hover:text-red-500 p-0.5 rounded"
                title="Clear"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ClockIcon className="w-4 h-4 text-royal-600" />
          </div>
        </button>
      </div>

      {/* Secondary preview underneath */}
      {secondaryTimeText && (
        <p className="text-[11px] text-slate-500 font-medium pl-1 flex items-center space-x-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold-500"></span>
          <span>{secondaryTimeText}</span>
        </p>
      )}

      {error && <p className="text-[11px] text-red-600 font-medium pl-1">{error}</p>}
      {helperText && !error && !secondaryTimeText && (
        <p className="text-[11px] text-slate-500 pl-1">{helperText}</p>
      )}

      {/* Popup Picker */}
      {isOpen && (
        <div
          className="absolute z-50 mt-1 left-0 right-0 sm:right-auto sm:w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3.5 space-y-3 animate-in fade-in zoom-in-95 duration-100"
          style={{ minWidth: '260px' }}
        >
          {/* Clock Switcher */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => handleToggleClock('ETHIOPIAN')}
              className={`flex-1 py-1 px-2 rounded-lg transition-all ${
                activeClock === 'ETHIOPIAN'
                  ? 'bg-royal text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🇪🇹 {currentLang === 'am' ? 'የኢትዮጵያ ሰዓት' : currentLang === 'en' ? 'Ethiopian Clock' : 'Sa\'aatii Itiyoophiyaa'}
            </button>
            <button
              type="button"
              onClick={() => handleToggleClock('INTERNATIONAL')}
              className={`flex-1 py-1 px-2 rounded-lg transition-all ${
                activeClock === 'INTERNATIONAL'
                  ? 'bg-royal text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🌍 24h
            </button>
          </div>

          {activeClock === 'ETHIOPIAN' ? (
            /* Ethiopian Clock Controls */
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    {currentLang === 'am' ? 'ሰዓት (1-12)' : currentLang === 'en' ? 'Hour (1-12)' : 'Sa\'aatii (1-12)'}
                  </label>
                  <select
                    value={selectedEthHour}
                    onChange={(e) =>
                      handleSelectEthiopian(Number(e.target.value), selectedMin, selectedEthIsDay)
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-royal"
                  >
                    {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => (
                      <option key={h} value={h}>
                        {h}:00
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    {currentLang === 'am' ? 'ደቂቃ' : currentLang === 'en' ? 'Minute' : 'Daqiiqaa'}
                  </label>
                  <select
                    value={selectedMin}
                    onChange={(e) =>
                      handleSelectEthiopian(selectedEthHour, Number(e.target.value), selectedEthIsDay)
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-royal"
                  >
                    {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                      <option key={m} value={m}>
                        :{String(m).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Day / Night Toggle */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  {currentLang === 'am' ? 'ክፍለ ጊዜ' : currentLang === 'en' ? 'Period' : 'Yeroo'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectEthiopian(selectedEthHour, selectedMin, true)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                      selectedEthIsDay
                        ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    ☀️ {currentLang === 'am' ? 'ቀን (Day)' : currentLang === 'en' ? 'Day (06:00-18:00)' : 'Guyyaa'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectEthiopian(selectedEthHour, selectedMin, false)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                      !selectedEthIsDay
                        ? 'bg-indigo-100 border-indigo-400 text-indigo-900 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🌙 {currentLang === 'am' ? 'ምሽት/ሌሊት (Night)' : currentLang === 'en' ? 'Night (18:00-06:00)' : 'Halkan'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* International (24h) Controls */
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  {currentLang === 'am' ? 'ሰዓት (0-23)' : currentLang === 'en' ? 'Hour (00-23)' : 'Sa\'aatii (00-23)'}
                </label>
                <select
                  value={selectedH24}
                  onChange={(e) => handleSelectInternational(Number(e.target.value), selectedMin)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-royal"
                >
                  {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  {currentLang === 'am' ? 'ደቂቃ' : currentLang === 'en' ? 'Minute' : 'Daqiiqaa'}
                </label>
                <select
                  value={selectedMin}
                  onChange={(e) => handleSelectInternational(selectedH24, Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-royal"
                >
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                    <option key={m} value={m}>
                      :{String(m).padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Quick Shortcuts */}
          <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-100">
            {['06:00', '08:30', '09:00', '14:00', '18:00', '19:30'].map((timePreset) => {
              const [th, tm] = timePreset.split(':').map(Number);
              return (
                <button
                  key={timePreset}
                  type="button"
                  onClick={() => {
                    handleSelectInternational(th, tm);
                    setIsOpen(false);
                  }}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-bold transition"
                >
                  {timePreset}
                </button>
              );
            })}
          </div>

          {/* Done Button */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-royal text-white font-bold rounded-lg text-xs hover:bg-royal/90 transition shadow-sm"
            >
              {currentLang === 'am' ? 'ተከናውኗል' : currentLang === 'en' ? 'Done' : 'Xumurame'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimePicker;
