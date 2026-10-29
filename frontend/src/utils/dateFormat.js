/**
 * St. George Church (WQG) - Unified Date & Time Formatter
 * 
 * Rules:
 * 1. Timezone: Africa/Addis_Ababa (UTC+3, no DST). Never use device local time for domain logic.
 * 2. Date-time values = UTC instant (ISO). Displayed in Addis time. If device offset differs,
 *    a small "(your time: ...)" note is appended.
 * 3. Date-only values = Gregorian YYYY-MM-DD, displayed with UTC so the day never shifts.
 * 4. Dual calendar support: Ethiopian and Gregorian calendars.
 */

import {
  toEthiopian,
  toGregorian,
  getEthiopianMonthName,
  getEthiopianWeekdayName,
  getGregorianMonthName,
  formatEthiopianClock,
  toEthiopianClock,
  GREGORIAN_MONTHS
} from './ethiopianCalendar.js';

export const ADDIS_TZ = 'Africa/Addis_Ababa';
export const ADDIS_OFFSET_MINUTES = -180; // UTC+3 is -180 minutes in JS getTimezoneOffset() convention

/**
 * Check if the viewer's browser device has a timezone offset different from Addis Ababa (UTC+3)
 */
export function isDeviceOffsetDifferent() {
  if (typeof window === 'undefined') return false;
  return new Date().getTimezoneOffset() !== ADDIS_OFFSET_MINUTES;
}

/**
 * Get device local time note for UTC instant, e.g. "(your time: 03:17)"
 */
export function getDeviceTimeNote(dateInput) {
  if (!isDeviceOffsetDifferent() || !dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (!d || isNaN(d.getTime())) return '';

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `(your time: ${hours}:${minutes})`;
}

/**
 * Parse date safely, distinguishing date-only (YYYY-MM-DD) from date-time (ISO instant).
 */
export function parseDateInput(dateInput, isDateOnly = false) {
  if (!dateInput) return null;

  if (typeof dateInput === 'string') {
    const isIsoDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim());
    if (isIsoDateOnly || isDateOnly) {
      const [y, m, d] = dateInput.trim().split('T')[0].split('-').map(Number);
      return {
        year: y,
        month: m,
        day: d,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isDateOnly: true,
        utcDate: new Date(Date.UTC(y, m - 1, d))
      };
    }
  }

  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return null;

  // For instant dates, convert to Addis Ababa civil time (UTC+3)
  const addisMs = d.getTime() + 3 * 3600 * 1000;
  const addisDate = new Date(addisMs);

  return {
    year: addisDate.getUTCFullYear(),
    month: addisDate.getUTCMonth() + 1,
    day: addisDate.getUTCDate(),
    hours: addisDate.getUTCHours(),
    minutes: addisDate.getUTCMinutes(),
    seconds: addisDate.getUTCSeconds(),
    isDateOnly: false,
    rawDate: d,
    addisDate
  };
}

/**
 * Format Date (date only, no time).
 * 
 * Options:
 * - calendar: 'ETHIOPIAN' | 'GREGORIAN'
 * - locale: 'om' | 'am' | 'en'
 * - showWeekday: boolean
 * - dateOnly: boolean (treat as date-only YYYY-MM-DD)
 */
export function formatDate(dateInput, options = {}) {
  const parsed = parseDateInput(dateInput, options.dateOnly);
  if (!parsed) return '';

  const {
    calendar = 'ETHIOPIAN',
    locale = 'om',
    showWeekday = false
  } = options;

  if (calendar === 'ETHIOPIAN') {
    const eth = toEthiopian({
      year: parsed.year,
      month: parsed.month,
      day: parsed.day
    });
    if (!eth) return '';

    const mName = getEthiopianMonthName(eth.month, locale);
    let weekdayStr = '';
    if (showWeekday && parsed.rawDate) {
      const weekdayIdx = parsed.rawDate.getUTCDay();
      weekdayStr = `${getEthiopianWeekdayName(weekdayIdx, locale)}, `;
    }

    if (locale === 'am') {
      return `${weekdayStr}${mName} ${eth.day} ቀን ${eth.year} ዓ.ም.`;
    } else if (locale === 'en') {
      return `${weekdayStr}${mName} ${eth.day}, ${eth.year} E.C.`;
    } else {
      return `${weekdayStr}${mName} ${eth.day}, ${eth.year}`;
    }
  } else {
    // Gregorian
    const mName = getGregorianMonthName(parsed.month, locale);
    let weekdayStr = '';
    if (showWeekday && parsed.rawDate) {
      const weekdayIdx = parsed.rawDate.getUTCDay();
      weekdayStr = `${getEthiopianWeekdayName(weekdayIdx, locale)}, `;
    }

    if (locale === 'am') {
      return `${weekdayStr}${mName} ${parsed.day} ቀን ${parsed.year} እ.ኤ.አ.`;
    } else if (locale === 'en') {
      return `${weekdayStr}${mName} ${parsed.day}, ${parsed.year}`;
    } else {
      return `${weekdayStr}${mName} ${parsed.day}, ${parsed.year}`;
    }
  }
}

/**
 * Format Time string (e.g. "14:30" or Ethiopian clock "8:30 (Guyyaa)")
 * 
 * Options:
 * - clock: 'INTERNATIONAL' | 'ETHIOPIAN'
 * - locale: 'om' | 'am' | 'en'
 * - showDeviceNote: boolean
 */
export function formatTime(dateInput, options = {}) {
  const parsed = parseDateInput(dateInput, options.dateOnly);
  if (!parsed) return '';

  const {
    clock = 'INTERNATIONAL',
    locale = 'om',
    showDeviceNote = false
  } = options;

  let timeStr = '';
  if (clock === 'ETHIOPIAN') {
    timeStr = formatEthiopianClock(parsed.hours, parsed.minutes, locale);
  } else {
    const h = String(parsed.hours).padStart(2, '0');
    const m = String(parsed.minutes).padStart(2, '0');
    timeStr = `${h}:${m}`;
  }

  if (showDeviceNote && parsed.rawDate && isDeviceOffsetDifferent()) {
    const note = getDeviceTimeNote(parsed.rawDate);
    if (note) timeStr += ` ${note}`;
  }

  return timeStr;
}

/**
 * Format Date and Time together
 * 
 * Options:
 * - calendar: 'ETHIOPIAN' | 'GREGORIAN'
 * - clock: 'INTERNATIONAL' | 'ETHIOPIAN'
 * - locale: 'om' | 'am' | 'en'
 * - showDeviceNote: boolean (default true)
 */
export function formatDateTime(dateInput, options = {}) {
  const parsed = parseDateInput(dateInput, options.dateOnly);
  if (!parsed) return '';

  const {
    calendar = 'ETHIOPIAN',
    clock = 'INTERNATIONAL',
    locale = 'om',
    showDeviceNote = true
  } = options;

  const dateStr = formatDate(dateInput, { calendar, locale, dateOnly: parsed.isDateOnly });
  const timeStr = formatTime(dateInput, { clock, locale, showDeviceNote });

  return `${dateStr} ${timeStr}`;
}

/**
 * Format Dual calendars (both Ethiopian and Gregorian)
 * e.g. "ጥቅምት 19/2019 (29 Oct 2026)" or "Tikimt 19, 2019 (29 Oct 2026)"
 */
export function formatDual(dateInput, options = {}) {
  const parsed = parseDateInput(dateInput, options.dateOnly);
  if (!parsed) return '';

  const {
    locale = 'om',
    primary = 'ETHIOPIAN',
    includeTime = false,
    clock = 'INTERNATIONAL'
  } = options;

  const eth = toEthiopian({
    year: parsed.year,
    month: parsed.month,
    day: parsed.day
  });
  if (!eth) return '';

  const ethMName = getEthiopianMonthName(eth.month, locale);
  const gregMShort = GREGORIAN_MONTHS.en[parsed.month - 1].slice(0, 3);

  const ethText = `${ethMName} ${eth.day}, ${eth.year}`;
  const gregText = `${parsed.day} ${gregMShort} ${parsed.year}`;

  let result = primary === 'ETHIOPIAN'
    ? `${ethText} (${gregText})`
    : `${gregText} (${ethText})`;

  if (includeTime) {
    const timeText = formatTime(dateInput, { clock, locale });
    result += ` ${timeText}`;
  }

  return result;
}

/**
 * Format Time Range, e.g. "08:30 - 11:30" or "2:30 - 5:30 Guyyaa"
 */
export function formatTimeRange(startDateInput, endDateInput, options = {}) {
  if (!startDateInput) return '';
  const { clock = 'INTERNATIONAL', locale = 'om' } = options;

  const startParsed = parseDateInput(startDateInput);
  if (!startParsed) return '';

  if (!endDateInput) {
    return formatTime(startDateInput, options);
  }

  const endParsed = parseDateInput(endDateInput);
  if (!endParsed) {
    return formatTime(startDateInput, options);
  }

  if (clock === 'ETHIOPIAN') {
    const ethStart = toEthiopianClock(startParsed.hours, startParsed.minutes);
    const ethEnd = toEthiopianClock(endParsed.hours, endParsed.minutes);
    const startM = String(ethStart.minute).padStart(2, '0');
    const endM = String(ethEnd.minute).padStart(2, '0');

    let period = ethEnd.isDay ? 'Guyyaa' : 'Halkan';
    if (locale === 'am') period = ethEnd.isDay ? 'ቀን' : 'ምሽት';
    if (locale === 'en') period = ethEnd.isDay ? 'Day' : 'Night';

    return `${ethStart.hour}:${startM} - ${ethEnd.hour}:${endM} (${period})`;
  } else {
    const sh = String(startParsed.hours).padStart(2, '0');
    const sm = String(startParsed.minutes).padStart(2, '0');
    const eh = String(endParsed.hours).padStart(2, '0');
    const em = String(endParsed.minutes).padStart(2, '0');
    return `${sh}:${sm} - ${eh}:${em}`;
  }
}

/**
 * Format Relative time ("5 min ago", "2 hours ago", "in 3 days") in om, am, en
 */
export function formatRelative(dateInput, lang = 'om') {
  if (!dateInput) return '';
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const now = Date.now();
  const diffSec = Math.floor((now - d.getTime()) / 1000);
  const isPast = diffSec >= 0;
  const absSec = Math.abs(diffSec);

  const minutes = Math.floor(absSec / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (lang === 'am') {
    if (absSec < 45) return 'አሁን';
    if (minutes < 60) return isPast ? `ከ${minutes} ደቂቃ በፊት` : `ከ${minutes} ደቂቃ በኋላ`;
    if (hours < 24) return isPast ? `ከ${hours} ሰዓት በፊት` : `ከ${hours} ሰዓት በኋላ`;
    if (days === 1) return isPast ? 'ትናንት' : 'ነገ';
    if (days < 30) return isPast ? `ከ${days} ቀን በፊት` : `ከ${days} ቀን በኋላ`;
    if (months < 12) return isPast ? `ከ${months} ወር በፊት` : `ከ${months} ወር በኋላ`;
    return isPast ? `ከ${years} ዓመት በፊት` : `ከ${years} ዓመት በኋላ`;
  } else if (lang === 'en') {
    if (absSec < 45) return 'just now';
    if (minutes < 60) return isPast ? `${minutes} min ago` : `in ${minutes} min`;
    if (hours < 24) return isPast ? `${hours} hr${hours > 1 ? 's' : ''} ago` : `in ${hours} hr${hours > 1 ? 's' : ''}`;
    if (days === 1) return isPast ? 'yesterday' : 'tomorrow';
    if (days < 30) return isPast ? `${days} days ago` : `in ${days} days`;
    if (months < 12) return isPast ? `${months} month${months > 1 ? 's' : ''} ago` : `in ${months} month${months > 1 ? 's' : ''}`;
    return isPast ? `${years} year${years > 1 ? 's' : ''} ago` : `in ${years} year${years > 1 ? 's' : ''}`;
  } else {
    // Afaan Oromoo
    if (absSec < 45) return 'Amma';
    if (minutes < 60) return isPast ? `Daqiiqaa ${minutes} dura` : `Daqiiqaa ${minutes} booda`;
    if (hours < 24) return isPast ? `Sa\'aatii ${hours} dura` : `Sa\'aatii ${hours} booda`;
    if (days === 1) return isPast ? 'Kaleessa' : 'Boru';
    if (days < 30) return isPast ? `Guyyaa ${days} dura` : `Guyyaa ${days} booda`;
    if (months < 12) return isPast ? `Ji\'a ${months} dura` : `Ji\'a ${months} booda`;
    return isPast ? `Waggaa ${years} dura` : `Waggaa ${years} booda`;
  }
}

/**
 * Return today's date in Addis Ababa time as 'YYYY-MM-DD'
 */
export function getAddisToday() {
  const addisNow = new Date(Date.now() + 3 * 3600 * 1000);
  const y = addisNow.getUTCFullYear();
  const m = String(addisNow.getUTCMonth() + 1).padStart(2, '0');
  const d = String(addisNow.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Return current instant in UTC
 */
export function getAddisNow() {
  return new Date();
}

/**
 * Format date badge for public/home/events display: { day, month }
 */
export function getEventDateBadge(dateInput, lang = 'om', calendar = 'ETHIOPIAN') {
  const parsed = parseDateInput(dateInput);
  if (!parsed) return { day: '01', month: 'MES' };

  if (calendar === 'ETHIOPIAN') {
    const eth = toEthiopian({ year: parsed.year, month: parsed.month, day: parsed.day });
    if (!eth) return { day: '01', month: 'MES' };
    const day = String(eth.day).padStart(2, '0');
    const monthName = getEthiopianMonthName(eth.month, lang);
    const month = monthName.slice(0, 3).toUpperCase();
    return { day, month, year: eth.year };
  } else {
    const day = String(parsed.day).padStart(2, '0');
    const monthName = getGregorianMonthName(parsed.month, lang);
    const month = monthName.slice(0, 3).toUpperCase();
    return { day, month, year: parsed.year };
  }
}

/**
 * Countdown helper for future dates
 */
export function getCountdown(targetDateString) {
  if (!targetDateString) return null;
  const target = new Date(targetDateString).getTime();
  const now = Date.now();
  const diff = target - now;

  if (diff <= 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
