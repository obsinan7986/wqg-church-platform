import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useDateSettings } from '../../context/DateSettingsContext';
import {
  toEthiopian,
  toGregorian,
  daysInMonth,
  isLeapYear,
  getEthiopianMonthName,
  getGregorianMonthName,
  GREGORIAN_MONTHS,
  ETHIOPIAN_WEEKDAYS
} from '../../utils/ethiopianCalendar';
import { getAddisToday } from '../../utils/dateFormat';

export const DatePicker = ({
  value,
  onChange,
  dateOnly = true,
  label,
  error,
  helperText,
  required = false,
  disabled = false,
  min,
  max,
  placeholder,
  className = '',
  containerClassName = '',
  id,
  name
}) => {
  const { calendarPref, currentLang } = useDateSettings();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Active calendar view inside the picker popup (can be toggled inside popup)
  const [activeCal, setActiveCal] = useState(calendarPref || 'ETHIOPIAN');

  // Keep activeCal in sync if default preference changes
  useEffect(() => {
    setActiveCal(calendarPref);
  }, [calendarPref]);

  // Parse current value
  const parsedValue = useMemo(() => {
    if (!value) return null;
    let y, m, d;
    if (typeof value === 'string') {
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        y = parseInt(match[1], 10);
        m = parseInt(match[2], 10);
        d = parseInt(match[3], 10);
      } else {
        const parsed = new Date(value);
        if (isNaN(parsed.getTime())) return null;
        const addis = new Date(parsed.getTime() + 3 * 3600 * 1000);
        y = addis.getUTCFullYear();
        m = addis.getUTCMonth() + 1;
        d = addis.getUTCDate();
      }
    } else if (value instanceof Date) {
      if (isNaN(value.getTime())) return null;
      const addis = new Date(value.getTime() + 3 * 3600 * 1000);
      y = addis.getUTCFullYear();
      m = addis.getUTCMonth() + 1;
      d = addis.getUTCDate();
    } else {
      return null;
    }

    const greg = { year: y, month: m, day: d };
    const eth = toEthiopian(greg);
    return { greg, eth };
  }, [value]);

  // Addis today
  const addisToday = useMemo(() => {
    const todayStr = getAddisToday();
    const [y, m, d] = todayStr.split('-').map(Number);
    const greg = { year: y, month: m, day: d };
    const eth = toEthiopian(greg);
    return { greg, eth, iso: todayStr };
  }, []);

  // Current viewing month and year in picker
  const [viewYear, setViewYear] = useState(() => {
    if (parsedValue) {
      return activeCal === 'ETHIOPIAN' ? parsedValue.eth.year : parsedValue.greg.year;
    }
    return activeCal === 'ETHIOPIAN' ? addisToday.eth.year : addisToday.greg.year;
  });

  const [viewMonth, setViewMonth] = useState(() => {
    if (parsedValue) {
      return activeCal === 'ETHIOPIAN' ? parsedValue.eth.month : parsedValue.greg.month;
    }
    return activeCal === 'ETHIOPIAN' ? addisToday.eth.month : addisToday.greg.month;
  });

  // When opening or activeCal changes, sync viewing year/month
  const handleToggleCal = (targetCal) => {
    if (targetCal === activeCal) return;
    setActiveCal(targetCal);

    if (parsedValue) {
      if (targetCal === 'ETHIOPIAN') {
        setViewYear(parsedValue.eth.year);
        setViewMonth(parsedValue.eth.month);
      } else {
        setViewYear(parsedValue.greg.year);
        setViewMonth(parsedValue.greg.month);
      }
    } else {
      if (targetCal === 'ETHIOPIAN') {
        setViewYear(addisToday.eth.year);
        setViewMonth(addisToday.eth.month);
      } else {
        setViewYear(addisToday.greg.year);
        setViewMonth(addisToday.greg.month);
      }
    }
  };

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

  // Compute number of days in the currently viewed month
  const totalDays = useMemo(() => {
    if (activeCal === 'ETHIOPIAN') {
      return daysInMonth(viewYear, viewMonth);
    } else {
      // Gregorian days in month
      return new Date(viewYear, viewMonth, 0).getDate();
    }
  }, [activeCal, viewYear, viewMonth]);

  // First day of month weekday offset (0 = Sunday, 1 = Monday...)
  const firstDayWeekday = useMemo(() => {
    let gregY = viewYear;
    let gregM = viewMonth;
    let gregD = 1;

    if (activeCal === 'ETHIOPIAN') {
      const g = toGregorian(viewYear, viewMonth, 1);
      gregY = g.year;
      gregM = g.month;
      gregD = g.day;
    }
    return new Date(Date.UTC(gregY, gregM - 1, gregD)).getUTCDay();
  }, [activeCal, viewYear, viewMonth]);

  // Handle Day Selection
  const handleSelectDay = (day) => {
    let targetGreg;
    if (activeCal === 'ETHIOPIAN') {
      targetGreg = toGregorian(viewYear, viewMonth, day);
    } else {
      targetGreg = { year: viewYear, month: viewMonth, day };
    }

    const yStr = String(targetGreg.year).padStart(4, '0');
    const mStr = String(targetGreg.month).padStart(2, '0');
    const dStr = String(targetGreg.day).padStart(2, '0');
    const isoDateOnly = `${yStr}-${mStr}-${dStr}`;

    if (dateOnly) {
      onChange(isoDateOnly);
    } else {
      // Create UTC instant with Addis midnight (or preserve existing time if present)
      const dateObj = new Date(Date.UTC(targetGreg.year, targetGreg.month - 1, targetGreg.day, 0, 0, 0));
      onChange(dateObj.toISOString());
    }
    setIsOpen(false);
  };

  // Quick pick Today
  const handlePickToday = () => {
    if (dateOnly) {
      onChange(addisToday.iso);
    } else {
      onChange(new Date().toISOString());
    }
    setViewYear(activeCal === 'ETHIOPIAN' ? addisToday.eth.year : addisToday.greg.year);
    setViewMonth(activeCal === 'ETHIOPIAN' ? addisToday.eth.month : addisToday.greg.month);
    setIsOpen(false);
  };

  // Handle Month Navigation
  const handlePrevMonth = () => {
    const maxMonths = activeCal === 'ETHIOPIAN' ? 13 : 12;
    if (viewMonth === 1) {
      setViewMonth(maxMonths);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    const maxMonths = activeCal === 'ETHIOPIAN' ? 13 : 12;
    if (viewMonth === maxMonths) {
      setViewMonth(1);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Format display text for input box
  const displayInputText = useMemo(() => {
    if (!parsedValue) return '';
    if (activeCal === 'ETHIOPIAN') {
      const mName = getEthiopianMonthName(parsedValue.eth.month, currentLang);
      return `${mName} ${parsedValue.eth.day}, ${parsedValue.eth.year}`;
    } else {
      const mName = getGregorianMonthName(parsedValue.greg.month, currentLang);
      return `${mName} ${parsedValue.greg.day}, ${parsedValue.greg.year}`;
    }
  }, [parsedValue, activeCal, currentLang]);

  // Secondary text shown under field (other calendar)
  const secondaryDateText = useMemo(() => {
    if (!parsedValue) return null;
    if (activeCal === 'ETHIOPIAN') {
      const gm = getGregorianMonthName(parsedValue.greg.month, currentLang);
      return `Gregorian: ${gm} ${parsedValue.greg.day}, ${parsedValue.greg.year}`;
    } else {
      const em = getEthiopianMonthName(parsedValue.eth.month, currentLang);
      return `Ethiopian: ${em} ${parsedValue.eth.day}, ${parsedValue.eth.year}`;
    }
  }, [parsedValue, activeCal, currentLang]);

  // Year options for fast dropdown (1920 to 2050)
  const yearOptions = useMemo(() => {
    const currentEthYear = addisToday.eth.year;
    const currentGregYear = addisToday.greg.year;
    const startYear = activeCal === 'ETHIOPIAN' ? currentEthYear - 90 : currentGregYear - 90;
    const endYear = activeCal === 'ETHIOPIAN' ? currentEthYear + 15 : currentGregYear + 15;
    const years = [];
    for (let y = endYear; y >= startYear; y--) {
      years.push(y);
    }
    return years;
  }, [activeCal, addisToday]);

  // Month list for dropdown
  const monthList = useMemo(() => {
    const count = activeCal === 'ETHIOPIAN' ? 13 : 12;
    const list = [];
    for (let m = 1; m <= count; m++) {
      const name =
        activeCal === 'ETHIOPIAN'
          ? getEthiopianMonthName(m, currentLang)
          : getGregorianMonthName(m, currentLang);
      list.push({ month: m, name });
    }
    return list;
  }, [activeCal, currentLang]);

  // Weekday initials (7 columns)
  const weekdayInitials = useMemo(() => {
    const langKey = ['am', 'en', 'om'].includes(currentLang) ? currentLang : 'om';
    if (langKey === 'am') return ['እ', 'ሰ', 'ማ', 'ረ', 'ሐ', 'ዓ', 'ቅ'];
    if (langKey === 'en') return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    return ['Dil', 'Wii', 'Qib', 'Roo', 'Kam', 'Jim', 'San'];
  }, [currentLang]);

  return (
    <div className={`space-y-1 relative ${containerClassName}`} ref={containerRef}>
      {label && (
        <label htmlFor={id || name} className="text-slate-700 font-bold block text-xs">
          {label} {required && <span className="text-gold-600 font-bold">*</span>}
        </label>
      )}

      {/* Input Display Button */}
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
            {displayInputText || placeholder || (currentLang === 'am' ? 'ቀን ይምረጡ' : currentLang === 'en' ? 'Select date' : 'Guyyaa filadhaa')}
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
            <CalendarIcon className="w-4 h-4 text-royal-600" />
          </div>
        </button>
      </div>

      {/* Secondary date preview underneath */}
      {secondaryDateText && (
        <p className="text-[11px] text-slate-500 font-medium pl-1 flex items-center space-x-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold-500"></span>
          <span>{secondaryDateText}</span>
        </p>
      )}

      {error && <p className="text-[11px] text-red-600 font-medium pl-1">{error}</p>}
      {helperText && !error && !secondaryDateText && (
        <p className="text-[11px] text-slate-500 pl-1">{helperText}</p>
      )}

      {/* Popup Calendar */}
      {isOpen && (
        <div
          className="absolute z-50 mt-1 left-0 right-0 sm:right-auto sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3.5 space-y-3 animate-in fade-in zoom-in-95 duration-100"
          style={{ minWidth: '290px' }}
        >
          {/* Calendar Type Tabs */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => handleToggleCal('ETHIOPIAN')}
              className={`flex-1 py-1 px-2 rounded-lg transition-all ${
                activeCal === 'ETHIOPIAN'
                  ? 'bg-royal text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🇪🇹 {currentLang === 'am' ? 'ኢትዮጵያ' : currentLang === 'en' ? 'Ethiopian' : 'Itiyophiyaa'}
            </button>
            <button
              type="button"
              onClick={() => handleToggleCal('GREGORIAN')}
              className={`flex-1 py-1 px-2 rounded-lg transition-all ${
                activeCal === 'GREGORIAN'
                  ? 'bg-royal text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🌍 {currentLang === 'am' ? 'ግሪጎሪያን' : currentLang === 'en' ? 'Gregorian' : 'Idil-addunyaa'}
            </button>
          </div>

          {/* Month & Year Selection Header with fast dropdowns */}
          <div className="flex items-center justify-between gap-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 flex-1 justify-center">
              {/* Month Dropdown */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-royal cursor-pointer"
              >
                {monthList.map((m) => (
                  <option key={m.month} value={m.month}>
                    {m.name}
                  </option>
                ))}
              </select>

              {/* Year Dropdown */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-royal cursor-pointer"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Row */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
            {weekdayInitials.map((w, idx) => (
              <div key={idx} className="py-1">
                {w}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Empty slots for first day offset */}
            {Array.from({ length: firstDayWeekday }).map((_, idx) => (
              <div key={`empty-${idx}`} className="w-8 h-8" />
            ))}

            {/* Days of Month */}
            {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
              // Check if selected
              let isSelected = false;
              if (parsedValue) {
                if (activeCal === 'ETHIOPIAN') {
                  isSelected =
                    parsedValue.eth.year === viewYear &&
                    parsedValue.eth.month === viewMonth &&
                    parsedValue.eth.day === d;
                } else {
                  isSelected =
                    parsedValue.greg.year === viewYear &&
                    parsedValue.greg.month === viewMonth &&
                    parsedValue.greg.day === d;
                }
              }

              // Check if today
              let isToday = false;
              if (activeCal === 'ETHIOPIAN') {
                isToday =
                  addisToday.eth.year === viewYear &&
                  addisToday.eth.month === viewMonth &&
                  addisToday.eth.day === d;
              } else {
                isToday =
                  addisToday.greg.year === viewYear &&
                  addisToday.greg.month === viewMonth &&
                  addisToday.greg.day === d;
              }

              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleSelectDay(d)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                    isSelected
                      ? 'bg-royal text-white shadow-md ring-2 ring-gold-400'
                      : isToday
                      ? 'bg-gold-50 text-gold-700 border border-gold-300 font-extrabold hover:bg-gold-100'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>

          {/* Footer Actions: Today & Close */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <button
              type="button"
              onClick={handlePickToday}
              className="px-2.5 py-1 text-royal font-bold hover:bg-royal/5 rounded-lg transition"
            >
              {currentLang === 'am' ? 'ዛሬ' : currentLang === 'en' ? 'Today (Addis)' : 'Har\'a (Addis)'}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 text-slate-500 font-medium hover:bg-slate-100 rounded-lg transition"
            >
              {currentLang === 'am' ? 'ዝጋ' : currentLang === 'en' ? 'Close' : 'Cufi'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
