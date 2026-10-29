/**
 * Backward compatibility wrapper delegating to new unified dateFormat.js & ethiopianCalendar.js
 */

import {
  formatDate,
  formatDateTime,
  formatTime,
  formatDual,
  formatTimeRange,
  formatRelative,
  getEventDateBadge,
  getCountdown,
  getAddisToday,
  getAddisNow
} from './dateFormat.js';

export {
  formatDate,
  formatDateTime,
  formatTime,
  formatDual,
  formatTimeRange,
  formatRelative,
  getEventDateBadge,
  getCountdown,
  getAddisToday,
  getAddisNow
};

/**
 * Format a Date object or ISO string based on current language
 */
export const formatEventDate = (dateString, lang = 'om', calendar = 'ETHIOPIAN') => {
  return formatDate(dateString, { locale: lang, calendar });
};

/**
 * Format time of day
 */
export const formatTimeOnly = (dateString, clock = 'INTERNATIONAL', lang = 'om') => {
  return formatTime(dateString, { clock, locale: lang });
};

export default {
  formatDate,
  formatDateTime,
  formatTime,
  formatDual,
  formatTimeRange,
  formatRelative,
  getEventDateBadge,
  getCountdown,
  getAddisToday,
  getAddisNow,
  formatEventDate,
  formatTimeOnly
};
