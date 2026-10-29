import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import api from '../api/axios';
import {
  formatDate as formatUtilDate,
  formatDateTime as formatUtilDateTime,
  formatTime as formatUtilTime,
  formatDual as formatUtilDual,
  formatTimeRange as formatUtilTimeRange,
  formatRelative as formatUtilRelative,
  getEventDateBadge as getUtilEventDateBadge,
  getCountdown as getUtilCountdown,
  getAddisToday as getUtilAddisToday,
  getAddisNow as getUtilAddisNow,
  isDeviceOffsetDifferent,
  getDeviceTimeNote
} from '../utils/dateFormat';

const DateSettingsContext = createContext(null);

export const DateSettingsProvider = ({ children }) => {
  const { user, updateUser } = useAuth();
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'om';

  // Determine initial calendar preference
  const [calendarPref, setCalendarPrefState] = useState(() => {
    if (user?.calendarPref) return user.calendarPref;
    const local = localStorage.getItem('wqg_calendar_pref');
    if (local && (local === 'ETHIOPIAN' || local === 'GREGORIAN')) return local;
    return currentLang === 'en' ? 'GREGORIAN' : 'ETHIOPIAN';
  });

  // Determine initial clock preference
  const [clockPref, setClockPrefState] = useState(() => {
    if (user?.clockPref) return user.clockPref;
    const local = localStorage.getItem('wqg_clock_pref');
    if (local && (local === 'INTERNATIONAL' || local === 'ETHIOPIAN')) return local;
    return 'INTERNATIONAL';
  });

  // Keep in sync with user profile if it loads later
  useEffect(() => {
    if (user?.calendarPref && user.calendarPref !== calendarPref) {
      setCalendarPrefState(user.calendarPref);
      localStorage.setItem('wqg_calendar_pref', user.calendarPref);
    }
    if (user?.clockPref && user.clockPref !== clockPref) {
      setClockPrefState(user.clockPref);
      localStorage.setItem('wqg_clock_pref', user.clockPref);
    }
  }, [user?.calendarPref, user?.clockPref]);

  // Set Calendar Preference
  const setCalendarPref = useCallback(
    async (pref) => {
      if (pref !== 'ETHIOPIAN' && pref !== 'GREGORIAN') return;
      setCalendarPrefState(pref);
      localStorage.setItem('wqg_calendar_pref', pref);

      if (user) {
        updateUser({ calendarPref: pref });
        try {
          await api.patch('/auth/profile', { calendarPref: pref });
        } catch (err) {
          console.warn('[DateSettings] Failed to persist calendar preference to backend:', err.message);
        }
      }
    },
    [user, updateUser]
  );

  // Set Clock Preference
  const setClockPref = useCallback(
    async (pref) => {
      if (pref !== 'INTERNATIONAL' && pref !== 'ETHIOPIAN') return;
      setClockPrefState(pref);
      localStorage.setItem('wqg_clock_pref', pref);

      if (user) {
        updateUser({ clockPref: pref });
        try {
          await api.patch('/auth/profile', { clockPref: pref });
        } catch (err) {
          console.warn('[DateSettings] Failed to persist clock preference to backend:', err.message);
        }
      }
    },
    [user, updateUser]
  );

  // Toggle helpers
  const toggleCalendarPref = useCallback(() => {
    setCalendarPref(calendarPref === 'ETHIOPIAN' ? 'GREGORIAN' : 'ETHIOPIAN');
  }, [calendarPref, setCalendarPref]);

  const toggleClockPref = useCallback(() => {
    setClockPref(clockPref === 'INTERNATIONAL' ? 'ETHIOPIAN' : 'INTERNATIONAL');
  }, [clockPref, setClockPref]);

  // Bound formatter functions
  const formatDate = useCallback(
    (date, opts = {}) => {
      return formatUtilDate(date, {
        calendar: opts.calendar || calendarPref,
        locale: opts.locale || currentLang,
        ...opts
      });
    },
    [calendarPref, currentLang]
  );

  const formatDateTime = useCallback(
    (date, opts = {}) => {
      return formatUtilDateTime(date, {
        calendar: opts.calendar || calendarPref,
        clock: opts.clock || clockPref,
        locale: opts.locale || currentLang,
        ...opts
      });
    },
    [calendarPref, clockPref, currentLang]
  );

  const formatTime = useCallback(
    (date, opts = {}) => {
      return formatUtilTime(date, {
        clock: opts.clock || clockPref,
        locale: opts.locale || currentLang,
        ...opts
      });
    },
    [clockPref, currentLang]
  );

  const formatDual = useCallback(
    (date, opts = {}) => {
      return formatUtilDual(date, {
        primary: opts.primary || calendarPref,
        locale: opts.locale || currentLang,
        clock: opts.clock || clockPref,
        ...opts
      });
    },
    [calendarPref, clockPref, currentLang]
  );

  const formatTimeRange = useCallback(
    (start, end, opts = {}) => {
      return formatUtilTimeRange(start, end, {
        clock: opts.clock || clockPref,
        locale: opts.locale || currentLang,
        ...opts
      });
    },
    [clockPref, currentLang]
  );

  const formatRelative = useCallback(
    (date) => {
      return formatUtilRelative(date, currentLang);
    },
    [currentLang]
  );

  const getEventDateBadge = useCallback(
    (date) => {
      return getUtilEventDateBadge(date, currentLang, calendarPref);
    },
    [currentLang, calendarPref]
  );

  const value = useMemo(
    () => ({
      calendarPref,
      clockPref,
      setCalendarPref,
      setClockPref,
      toggleCalendarPref,
      toggleClockPref,
      formatDate,
      formatDateTime,
      formatTime,
      formatDual,
      formatTimeRange,
      formatRelative,
      getEventDateBadge,
      getCountdown: getUtilCountdown,
      getAddisToday: getUtilAddisToday,
      getAddisNow: getUtilAddisNow,
      isDeviceOffsetDifferent,
      getDeviceTimeNote,
      currentLang
    }),
    [
      calendarPref,
      clockPref,
      setCalendarPref,
      setClockPref,
      toggleCalendarPref,
      toggleClockPref,
      formatDate,
      formatDateTime,
      formatTime,
      formatDual,
      formatTimeRange,
      formatRelative,
      getEventDateBadge,
      currentLang
    ]
  );

  return <DateSettingsContext.Provider value={value}>{children}</DateSettingsContext.Provider>;
};

export const useDateSettings = () => {
  const context = useContext(DateSettingsContext);
  if (!context) {
    throw new Error('useDateSettings must be used within a DateSettingsProvider');
  }
  return context;
};
