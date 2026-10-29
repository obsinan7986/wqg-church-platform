/**
 * Backend Ethiopian Calendar Engine
 * Algorithm: Julian Day Number (JDN) with epoch 1723856 (Amete Mihret)
 */

const JD_EPOCH_AMETE_MIHRET = 1723856;

const RAW_ETHIOPIAN_MONTHS = {
  am: [
    'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት',
    'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜን'
  ],
  en: [
    'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
    'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
  ],
  om: [
    'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
    'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
  ]
};

const ETHIOPIAN_MONTH_LIST = Array.from({ length: 13 }, (_, i) => ({
  id: i + 1,
  am: RAW_ETHIOPIAN_MONTHS.am[i],
  en: RAW_ETHIOPIAN_MONTHS.en[i],
  om: RAW_ETHIOPIAN_MONTHS.om[i]
}));

const monthArray = [...ETHIOPIAN_MONTH_LIST];
monthArray.am = RAW_ETHIOPIAN_MONTHS.am;
monthArray.en = RAW_ETHIOPIAN_MONTHS.en;
monthArray.om = RAW_ETHIOPIAN_MONTHS.om;

const ETHIOPIAN_MONTHS = monthArray;

function isLeapYear(year) {
  const y = Number(year);
  return (y % 4 === 3) || (y % 4 === -1);
}

function daysInMonth(year, month) {
  const m = Number(month);
  if (m >= 1 && m <= 12) return 30;
  if (m === 13) return isLeapYear(year) ? 6 : 5;
  throw new Error(`Invalid Ethiopian month: ${month}`);
}

function gregorianToJdn(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  const a = Math.floor((14 - m) / 12);
  const yAdj = y + 4800 - a;
  const mAdj = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * mAdj + 2) / 5) +
    365 * yAdj +
    Math.floor(yAdj / 4) -
    Math.floor(yAdj / 100) +
    Math.floor(yAdj / 400) -
    32045
  );
}

function jdnToGregorian(jdn) {
  const l = Number(jdn) + 68569;
  const n = Math.floor((4 * l) / 146097);
  const l2 = l - Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (l2 + 1)) / 1461001);
  const l3 = l2 - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * l3) / 2447);
  const day = l3 - Math.floor((2447 * j) / 80);
  const l4 = Math.floor(j / 11);
  const month = j + 2 - 12 * l4;
  const year = 100 * (n - 49) + i + l4;
  return { year, month, day };
}

function jdnToEthiopian(jdn) {
  const diff = Number(jdn) - JD_EPOCH_AMETE_MIHRET;
  const r = ((diff % 1461) + 1461) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const year = 4 * Math.floor(diff / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  const month = Math.floor(n / 30) + 1;
  const day = (n % 30) + 1;
  return { year, month, day };
}

function ethiopianToJdn(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  return (
    JD_EPOCH_AMETE_MIHRET +
    365 * y +
    Math.floor(y / 4) +
    30 * (m - 1) +
    d - 1
  );
}

function toEthiopian(dateInput) {
  if (!dateInput) return null;
  let y, m, d;
  if (typeof dateInput === 'string') {
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      y = parseInt(match[1], 10);
      m = parseInt(match[2], 10);
      d = parseInt(match[3], 10);
    } else {
      const parsed = new Date(dateInput);
      if (isNaN(parsed.getTime())) return null;
      const addisTime = new Date(parsed.getTime() + 3 * 3600 * 1000);
      y = addisTime.getUTCFullYear();
      m = addisTime.getUTCMonth() + 1;
      d = addisTime.getUTCDate();
    }
  } else if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return null;
    const addisTime = new Date(dateInput.getTime() + 3 * 3600 * 1000);
    y = addisTime.getUTCFullYear();
    m = addisTime.getUTCMonth() + 1;
    d = addisTime.getUTCDate();
  } else if (typeof dateInput === 'object') {
    y = Number(dateInput.year || dateInput.y);
    m = Number(dateInput.month || dateInput.m);
    d = Number(dateInput.day || dateInput.d);
  } else {
    return null;
  }
  const jdn = gregorianToJdn(y, m, d);
  return jdnToEthiopian(jdn);
}

function toGregorian(yearOrObj, maybeMonth, maybeDay) {
  let y, m, d;
  if (typeof yearOrObj === 'object' && yearOrObj !== null) {
    y = yearOrObj.year || yearOrObj.y;
    m = yearOrObj.month || yearOrObj.m;
    d = yearOrObj.day || yearOrObj.d;
  } else {
    y = yearOrObj;
    m = maybeMonth;
    d = maybeDay;
  }
  const jdn = ethiopianToJdn(y, m, d);
  return jdnToGregorian(jdn);
}

/**
 * Get current date in Addis Ababa (UTC+3)
 */
function getAddisDate(date = new Date()) {
  const addis = new Date(date.getTime() + 3 * 3600 * 1000);
  return {
    year: addis.getUTCFullYear(),
    month: addis.getUTCMonth() + 1,
    day: addis.getUTCDate(),
    hours: addis.getUTCHours(),
    minutes: addis.getUTCMinutes(),
    isoDate: `${addis.getUTCFullYear()}-${String(addis.getUTCMonth() + 1).padStart(2, '0')}-${String(addis.getUTCDate()).padStart(2, '0')}`
  };
}

/**
 * Fixed Church Feasts in the Ethiopian Calendar
 */
const FIXED_CHURCH_FEASTS = [
  { id: 'MESKEL', name: 'Meskel (Demera)', ethMonth: 1, ethDay: 17 },
  { id: 'GENNA', name: 'Genna (Christmas)', ethMonth: 4, ethDay: 29 },
  { id: 'TIMKET', name: 'Timket (Epiphany)', ethMonth: 5, ethDay: 11 },
  { id: 'GIYORGIS_ANNUAL', name: 'St. George (Annual)', ethMonth: 8, ethDay: 23 },
  { id: 'GIYORGIS_MONTHLY', name: 'St. George (Monthly)', ethDay: 23, recurrence: 'ETH_MONTHLY' }
];

/**
 * Ethiopian Clock Helpers
 * Ethiopian hour = ((h + 5) % 12) + 1
 * Day period: 06:00 - 17:59
 * Night period: 18:00 - 05:59
 */
function toEthiopianClock(hour24, minute = 0) {
  const h = Number(hour24);
  const m = Number(minute);
  const ethHour = ((h + 5) % 12) + 1;
  const isDay = h >= 6 && h < 18;
  return {
    hour: ethHour,
    minute: m,
    isDay,
    period: isDay ? 'day' : 'night'
  };
}

function fromEthiopianClock(ethHour, minute = 0, periodOrIsDay = true) {
  const eh = Number(ethHour);
  const m = Number(minute);
  const isDay = typeof periodOrIsDay === 'string'
    ? periodOrIsDay.toLowerCase() === 'day'
    : Boolean(periodOrIsDay);
  const base = eh % 12;
  const h = isDay ? base + 6 : (base + 18) % 24;
  return {
    hour24: h,
    hour: h,
    minute: m
  };
}

function formatEthiopianClock(hour24, minute = 0, lang = 'om') {
  const { hour, minute: m, isDay } = toEthiopianClock(hour24, minute);
  const minuteStr = String(m).padStart(2, '0');
  const periodText = lang === 'am' ? (isDay ? 'ቀን' : 'ሌሊት') : lang === 'en' ? (isDay ? 'Day' : 'Night') : (isDay ? 'Guyyaa' : 'Halkan');
  return `${hour}:${minuteStr} (${periodText})`;
}

module.exports = {
  JD_EPOCH_AMETE_MIHRET,
  ETHIOPIAN_MONTHS,
  FIXED_CHURCH_FEASTS,
  isLeapYear,
  daysInMonth,
  gregorianToJdn,
  jdnToGregorian,
  jdnToEthiopian,
  ethiopianToJdn,
  toEthiopian,
  toGregorian,
  getAddisDate,
  toEthiopianClock,
  fromEthiopianClock,
  formatEthiopianClock
};
