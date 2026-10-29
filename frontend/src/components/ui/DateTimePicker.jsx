import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar as CalendarIcon, Clock as ClockIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useDateSettings } from '../../context/DateSettingsContext';
import {
  toEthiopian,
  toGregorian,
  daysInMonth,
  getEthiopianMonthName,
  getGregorianMonthName,
  formatEthiopianClock,
  toEthiopianClock,
  fromEthiopianClock
} from '../../utils/ethiopianCalendar';
import { getAddisToday, isDeviceOffsetDifferent, getDeviceTimeNote } from '../../utils/dateFormat';

export const DateTimePicker = ({
  value, // ISO UTC string
  onChange,
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
  const { calendarPref, clockPref, currentLang } = useDateSettings();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const [activeCal, setActiveCal] = useState(calendarPref || 'ETHIOPIAN');
  const [activeClock, setActiveClock] = useState(clockPref || 'INTERNATIONAL');

  useEffect(() => {
    setActiveCal(calendarPref);
  }, [calendarPref]);

  useEffect(() => {
    setActiveClock(clockPref);
  }, [clockPref]);

  // Parse current UTC instant to Addis Ababa civil time (UTC+3)
  const parsed = useMemo(() => {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;

    const addisMs = d.getTime() + 3 * 3600 * 1000;
    const addisDate = new Date(addisMs);

    const greg = {
      year: addisDate.getUTCFullYear(),
      month: addisDate.getUTCMonth() + 1,
      day: addisDate.getUTCDate(),
      hour: addisDate.getUTCHours(),
      minute: addisDate.getUTCMinutes()
    };
    const eth = toEthiopian({ year: greg.year, month: greg.month, day: greg.day });
    const ethClock = toEthiopianClock(greg.hour, greg.minute);

    return {
      rawDate: d,
      greg,
      eth,
      ethClock
    };
  }, [value]);

  // Today in Addis
  const addisToday = useMemo(() => {
    const todayStr = getAddisToday();
    const [y, m, d] = todayStr.split('-').map(Number);
    const greg = { year: y, month: m, day: d };
    const eth = toEthiopian(greg);
    return { greg, eth };
  }, []);

  // Internal view state
  const [viewYear, setViewYear] = useState(() => {
    if (parsed) return activeCal === 'ETHIOPIAN' ? parsed.eth.year : parsed.greg.year;
    return activeCal === 'ETHIOPIAN' ? addisToday.eth.year : addisToday.greg.year;
  });

  const [viewMonth, setViewMonth] = useState(() => {
    if (parsed) return activeCal === 'ETHIOPIAN' ? parsed.eth.month : parsed.greg.month;
    return activeCal === 'ETHIOPIAN' ? addisToday.eth.month : addisToday.greg.month;
  });

  const [selectedHour, setSelectedHour] = useState(parsed ? parsed.greg.hour : 9);
  const [selectedMinute, setSelectedMinute] = useState(parsed ? parsed.greg.minute : 0);

  // Sync state if value changes externally
  useEffect(() => {
    if (parsed) {
      setViewYear(activeCal === 'ETHIOPIAN' ? parsed.eth.year : parsed.greg.year);
      setViewMonth(activeCal === 'ETHIOPIAN' ? parsed.eth.month : parsed.greg.month);
      setSelectedHour(parsed.greg.hour);
      setSelectedMinute(parsed.greg.minute);
    }
  }, [parsed, activeCal]);

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

  // Helper to commit date and time as UTC ISO string
  const commitDateTime = (gregYear, gregMonth, gregDay, hour24, min) => {
    // Addis is UTC+3. To get UTC instant:
    // UTC hour = hour24 - 3
    const utcMs = Date.UTC(gregYear, gregMonth - 1, gregDay, hour24 - 3, min, 0, 0);
    const isoString = new Date(utcMs).toISOString();
    onChange(isoString);
  };

  const handleSelectDay = (day) => {
    let targetGreg;
    if (activeCal === 'ETHIOPIAN') {
      targetGreg = toGregorian(viewYear, viewMonth, day);
    } else {
      targetGreg = { year: viewYear, month: viewMonth, day };
    }
    commitDateTime(targetGreg.year, targetGreg.month, targetGreg.day, selectedHour, selectedMinute);
  };

  const handleTimeChange = (newH24, newMin) => {
    setSelectedHour(newH24);
    setSelectedMinute(newMin);

    let targetGreg;
    if (parsed) {
      targetGreg = parsed.greg;
    } else {
      targetGreg = addisToday.greg;
    }
    commitDateTime(targetGreg.year, targetGreg.month, targetGreg.day, newH24, newMin);
  };

  const totalDays = useMemo(() => {
    if (activeCal === 'ETHIOPIAN') {
      return daysInMonth(viewYear, viewMonth);
    } else {
      return new Date(viewYear, viewMonth, 0).getDate();
    }
  }, [activeCal, viewYear, viewMonth]);

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

  // Formatted Input Box Text
  const displayInputText = useMemo(() => {
    if (!parsed) return '';

    let datePart = '';
    if (activeCal === 'ETHIOPIAN') {
      const mName = getEthiopianMonthName(parsed.eth.month, currentLang);
      datePart = `${mName} ${parsed.eth.day}, ${parsed.eth.year}`;
    } else {
      const mName = getGregorianMonthName(parsed.greg.month, currentLang);
      datePart = `${mName} ${parsed.greg.day}, ${parsed.greg.year}`;
    }

    let timePart = '';
    if (activeClock === 'ETHIOPIAN') {
      timePart = formatEthiopianClock(parsed.greg.hour, parsed.greg.minute, currentLang);
    } else {
      const hStr = String(parsed.greg.hour).padStart(2, '0');
      const mStr = String(parsed.greg.minute).padStart(2, '0');
      timePart = `${hStr}:${mStr}`;
    }

    let result = `${datePart} ${timePart}`;
    if (isDeviceOffsetDifferent() && parsed.rawDate) {
      const note = getDeviceTimeNote(parsed.rawDate);
      if (note) result += ` ${note}`;
    }
    return result;
  }, [parsed, activeCal, activeClock, currentLang]);

  // Secondary text (other calendar & clock)
  const secondaryText = useMemo(() => {
    if (!parsed) return null;
    let datePart = '';
    if (activeCal === 'ETHIOPIAN') {
      const gm = getGregorianMonthName(parsed.greg.month, currentLang);
      datePart = `Gregorian: ${gm} ${parsed.greg.day}, ${parsed.greg.year}`;
    } else {
      const em = getEthiopianMonthName(parsed.eth.month, currentLang);
      datePart = `Ethiopian: ${em} ${parsed.eth.day}, ${parsed.eth.year}`;
    }

    let timePart = '';
    if (activeClock === 'ETHIOPIAN') {
      timePart = `(24h: ${String(parsed.greg.hour).padStart(2, '0')}:${String(parsed.greg.minute).padStart(2, '0')})`;
    } else {
      timePart = `(Eth Clock: ${formatEthiopianClock(parsed.greg.hour, parsed.greg.minute, currentLang)})`;
    }

    return `${datePart} ${timePart}`;
  }, [parsed, activeCal, activeClock, currentLang]);

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

  const yearOptions = useMemo(() => {
    const cy = activeCal === 'ETHIOPIAN' ? addisToday.eth.year : addisToday.greg.year;
    const years = [];
    for (let y = cy + 10; y >= cy - 20; y--) {
      years.push(y);
    }
    return years;
  }, [activeCal, addisToday]);

  const weekdayInitials = useMemo(() => {
    const langKey = ['am', 'en', 'om'].includes(currentLang) ? currentLang : 'om';
    if (langKey === 'am') return ['እ', 'ሰ', 'ማ', 'ረ', 'ሐ', 'ዓ', 'ቅ'];
    if (langKey === 'en') return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    return ['Dil', 'Wii', 'Qib', 'Roo', 'Kam', 'Jim', 'San'];
  }, [currentLang]);

  const ethClockParsed = toEthiopianClock(selectedHour, selectedMinute);

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
            {displayInputText || placeholder || (currentLang === 'am' ? 'ቀንና ሰዓት ይምረጡ' : currentLang === 'en' ? 'Select date & time' : 'Guyyaa fi sa\'aatii')}
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

      {/* Secondary preview underneath */}
      {secondaryText && (
        <p className="text-[11px] text-slate-500 font-medium pl-1 flex items-center space-x-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold-500"></span>
          <span>{secondaryText}</span>
        </p>
      )}

      {error && <p className="text-[11px] text-red-600 font-medium pl-1">{error}</p>}
      {helperText && !error && !secondaryText && (
        <p className="text-[11px] text-slate-500 pl-1">{helperText}</p>
      )}

      {/* Popup Picker */}
      {isOpen && (
        <div
          className="absolute z-50 mt-1 left-0 right-0 sm:right-auto sm:w-84 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3.5 space-y-3 animate-in fade-in zoom-in-95 duration-100"
          style={{ minWidth: '310px' }}
        >
          {/* Header Controls: Calendar & Clock Mode */}
          <div className="flex gap-2">
            <div className="flex-1 flex items-center p-0.5 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveCal('ETHIOPIAN')}
                className={`flex-1 py-1 px-1.5 rounded-lg text-center transition-all ${
                  activeCal === 'ETHIOPIAN' ? 'bg-royal text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                🇪🇹 {currentLang === 'am' ? 'ኢትዮጵያ' : 'Itiyophiyaa'}
              </button>
              <button
                type="button"
                onClick={() => setActiveCal('GREGORIAN')}
                className={`flex-1 py-1 px-1.5 rounded-lg text-center transition-all ${
                  activeCal === 'GREGORIAN' ? 'bg-royal text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                🌍 Greg
              </button>
            </div>

            <div className="flex items-center p-0.5 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveClock('ETHIOPIAN')}
                className={`py-1 px-2 rounded-lg transition-all ${
                  activeClock === 'ETHIOPIAN' ? 'bg-royal text-white shadow-sm' : 'text-slate-600'
                }`}
                title="Ethiopian Clock"
              >
                🇪🇹 Eth
              </button>
              <button
                type="button"
                onClick={() => setActiveClock('INTERNATIONAL')}
                className={`py-1 px-2 rounded-lg transition-all ${
                  activeClock === 'INTERNATIONAL' ? 'bg-royal text-white shadow-sm' : 'text-slate-600'
                }`}
                title="International 24h"
              >
                🌍 24h
              </button>
            </div>
          </div>

          {/* Month & Year Selection */}
          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => {
                const maxM = activeCal === 'ETHIOPIAN' ? 13 : 12;
                if (viewMonth === 1) {
                  setViewMonth(maxM);
                  setViewYear((prev) => prev - 1);
                } else {
                  setViewMonth((prev) => prev - 1);
                }
              }}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 flex-1 justify-center">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800"
              >
                {monthList.map((m) => (
                  <option key={m.month} value={m.month}>
                    {m.name}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800"
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
              onClick={() => {
                const maxM = activeCal === 'ETHIOPIAN' ? 13 : 12;
                if (viewMonth === maxM) {
                  setViewMonth(1);
                  setViewYear((prev) => prev + 1);
                } else {
                  setViewMonth((prev) => prev + 1);
                }
              }}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-600"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Row */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
            {weekdayInitials.map((w, idx) => (
              <div key={idx}>{w}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: firstDayWeekday }).map((_, idx) => (
              <div key={`empty-${idx}`} className="w-8 h-7" />
            ))}

            {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
              let isSelected = false;
              if (parsed) {
                if (activeCal === 'ETHIOPIAN') {
                  isSelected =
                    parsed.eth.year === viewYear &&
                    parsed.eth.month === viewMonth &&
                    parsed.eth.day === d;
                } else {
                  isSelected =
                    parsed.greg.year === viewYear &&
                    parsed.greg.month === viewMonth &&
                    parsed.greg.day === d;
                }
              }

              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleSelectDay(d)}
                  className={`w-8 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                    isSelected
                      ? 'bg-royal text-white shadow-md ring-2 ring-gold-400'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>

          {/* Time Selection Section */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center space-x-1">
                <ClockIcon className="w-3.5 h-3.5 text-royal-600" />
                <span>{currentLang === 'am' ? 'ሰዓት' : currentLang === 'en' ? 'Time' : 'Sa\'aatii'}</span>
              </span>

              {activeClock === 'ETHIOPIAN' ? (
                <div className="flex items-center space-x-1 text-[11px]">
                  <select
                    value={ethClockParsed.hour}
                    onChange={(e) => {
                      const newEthH = Number(e.target.value);
                      const standard = fromEthiopianClock(newEthH, selectedMinute, ethClockParsed.isDay);
                      handleTimeChange(standard.hour, standard.minute);
                    }}
                    className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold text-slate-800"
                  >
                    {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <span>:</span>
                  <select
                    value={selectedMinute}
                    onChange={(e) => handleTimeChange(selectedHour, Number(e.target.value))}
                    className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold text-slate-800"
                  >
                    {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                      <option key={m} value={m}>
                        {String(m).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const standard = fromEthiopianClock(
                        ethClockParsed.hour,
                        selectedMinute,
                        !ethClockParsed.isDay
                      );
                      handleTimeChange(standard.hour, standard.minute);
                    }}
                    className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                      ethClockParsed.isDay
                        ? 'bg-amber-100 border-amber-300 text-amber-900'
                        : 'bg-indigo-100 border-indigo-300 text-indigo-900'
                    }`}
                  >
                    {ethClockParsed.isDay ? '☀️ Guyyaa' : '🌙 Halkan'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-[11px]">
                  <select
                    value={selectedHour}
                    onChange={(e) => handleTimeChange(Number(e.target.value), selectedMinute)}
                    className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold text-slate-800"
                  >
                    {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                  <span>:</span>
                  <select
                    value={selectedMinute}
                    onChange={(e) => handleTimeChange(selectedHour, Number(e.target.value))}
                    className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold text-slate-800"
                  >
                    {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                      <option key={m} value={m}>
                        {String(m).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Footer Done */}
          <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
            <button
              type="button"
              onClick={() => {
                onChange(new Date().toISOString());
                setIsOpen(false);
              }}
              className="text-royal font-bold hover:underline"
            >
              {currentLang === 'am' ? 'አሁን (Now)' : currentLang === 'en' ? 'Now' : 'Amma'}
            </button>
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

export default DateTimePicker;
