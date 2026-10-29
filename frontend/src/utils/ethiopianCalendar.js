/**
 * St. George Church (WQG) - Ethiopian Calendar & Clock Engine
 * 
 * Algorithm: Julian Day Number (JDN) with epoch 1723856 (Amete Mihret)
 * Exact bijection between Gregorian and Ethiopian calendars.
 */

export const JD_EPOCH_AMETE_MIHRET = 1723856;

/**
 * Ethiopian Month Names in 3 languages.
 * Note: Afaan Oromoo month names start with transliterations of Ethiopian calendar months
 * and are marked with reviewed: false for native speaker review.
 */
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
    { name: 'Meskerem', reviewed: false },
    { name: 'Tikimt', reviewed: false },
    { name: 'Hidar', reviewed: false },
    { name: 'Tahsas', reviewed: false },
    { name: 'Tir', reviewed: false },
    { name: 'Yekatit', reviewed: false },
    { name: 'Megabit', reviewed: false },
    { name: 'Miazia', reviewed: false },
    { name: 'Ginbot', reviewed: false },
    { name: 'Sene', reviewed: false },
    { name: 'Hamle', reviewed: false },
    { name: 'Nehase', reviewed: false },
    { name: 'Pagume', reviewed: false }
  ]
};

export const ETHIOPIAN_MONTH_LIST = Array.from({ length: 13 }, (_, i) => ({
  id: i + 1,
  am: RAW_ETHIOPIAN_MONTHS.am[i],
  en: RAW_ETHIOPIAN_MONTHS.en[i],
  om: RAW_ETHIOPIAN_MONTHS.om[i]
}));

// Multi-purpose export: true Array instance with .am, .en, .om properties attached
const monthArray = [...ETHIOPIAN_MONTH_LIST];
monthArray.am = RAW_ETHIOPIAN_MONTHS.am;
monthArray.en = RAW_ETHIOPIAN_MONTHS.en;
monthArray.om = RAW_ETHIOPIAN_MONTHS.om;

export const ETHIOPIAN_MONTHS = monthArray;

/**
 * Weekday Names (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 */
export const ETHIOPIAN_WEEKDAYS = {
  am: ['እሑድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'ዓርብ', 'ቅዳሜ'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  om: [
    { name: 'Dilbata', reviewed: true },
    { name: 'Wiixata', reviewed: true },
    { name: 'Qibxata', reviewed: true },
    { name: 'Roobii', reviewed: true },
    { name: 'Kamisa', reviewed: true },
    { name: 'Jimmata', reviewed: true },
    { name: 'Sanbata', reviewed: true }
  ]
};

/**
 * Gregorian Month Names in 3 languages (used in dual display & Gregorian mode)
 */
export const GREGORIAN_MONTHS = {
  am: [
    'ጃንዋሪ', 'ፌብሩዋሪ', 'ማርች', 'ኤፕሪል', 'ሜይ', 'ጁን',
    'ጁላይ', 'ኦገስት', 'ሴፕቴምበር', 'ኦክቶበር', 'ኖቬምበር', 'ዲሴምበር'
  ],
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ],
  om: [
    'Amajjii', 'Guraandhala', 'Bitooteessa', 'Ebla', 'Caamsaa', 'Waxabajjii',
    'Adooleessa', 'Hagayya', 'Fulbaana', 'Onkololeessa', 'Sadaasa', 'Muddee'
  ]
};

/**
 * Fixed Church Feasts in Ethiopian Calendar
 */
export const FIXED_CHURCH_FEASTS = [
  {
    id: 'st_george_monthly',
    name: {
      om: 'Qulqulluu Giyoorgis (Guyyaa 23ffaa ji\'a hundumaa)',
      am: 'ቅዱስ ጊዮርጊስ (በየወሩ 23)',
      en: 'St. George (Giyorgis) - 23rd of every month'
    },
    ethMonth: null, // every month
    ethDay: 23,
    type: 'ETH_MONTHLY'
  },
  {
    id: 'meskel',
    name: {
      om: 'Baraarama Masqalaa (Masqala)',
      am: 'የመስቀል በዓል',
      en: 'Feast of the Finding of the True Cross (Meskel)'
    },
    ethMonth: 1, // Meskerem
    ethDay: 17,
    type: 'ETH_YEARLY'
  },
  {
    id: 'genna',
    name: {
      om: 'Ayyaana Qillee / Dhaloota Kiristoos (Genna)',
      am: 'የገና በዓል (የጌታችን ልደት)',
      en: 'Ethiopian Christmas (Genna)'
    },
    ethMonth: 4, // Tahsas
    ethDay: 29, // In leap years, Genna is Tahsas 28; standard church feast is Tahsas 29
    type: 'ETH_YEARLY'
  },
  {
    id: 'timket',
    name: {
      om: 'Ayyaana Cuuphaa (Timket)',
      am: 'የጥምቀት በዓል',
      en: 'Ethiopian Epiphany (Timket)'
    },
    ethMonth: 5, // Tir
    ethDay: 11,
    type: 'ETH_YEARLY'
  },
  {
    id: 'st_george_annual',
    name: {
      om: 'Ayyaana Waggaa Qulqulluu Giyoorgis',
      am: 'ዓመታዊ የቅዱስ ጊዮርጊስ በዓል',
      en: 'St. George Annual Feast (Miazia 23)'
    },
    ethMonth: 8, // Miazia
    ethDay: 23,
    type: 'ETH_YEARLY'
  }
];

/**
 * Determine if an Ethiopian year is a leap year.
 * In the Ethiopian calendar, every 4th year is a leap year (year % 4 === 3).
 * In leap years, Pagume has 6 days instead of 5.
 */
export function isLeapYear(year) {
  const y = Number(year);
  return (y % 4 === 3) || (y % 4 === -1);
}

/**
 * Return number of days in an Ethiopian month.
 * Months 1..12 always have 30 days.
 * Month 13 (Pagume) has 6 days in leap years, 5 days in normal years.
 */
export function daysInMonth(year, month) {
  const m = Number(month);
  if (m >= 1 && m <= 12) return 30;
  if (m === 13) return isLeapYear(year) ? 6 : 5;
  throw new Error(`Invalid Ethiopian month: ${month}`);
}

/**
 * Convert Gregorian (Year, Month, Day) to Julian Day Number (JDN)
 */
export function gregorianToJdn(year, month, day) {
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

/**
 * Convert Julian Day Number (JDN) to Gregorian { year, month, day }
 */
export function jdnToGregorian(jdn) {
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

/**
 * Convert Julian Day Number (JDN) to Ethiopian { year, month, day }
 */
export function jdnToEthiopian(jdn) {
  const diff = Number(jdn) - JD_EPOCH_AMETE_MIHRET;
  const r = ((diff % 1461) + 1461) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const year = 4 * Math.floor(diff / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  const month = Math.floor(n / 30) + 1;
  const day = (n % 30) + 1;
  return { year, month, day };
}

/**
 * Convert Ethiopian (Year, Month, Day) to Julian Day Number (JDN)
 */
export function ethiopianToJdn(year, month, day) {
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

/**
 * Convert Gregorian date to Ethiopian calendar date.
 * Accepts:
 * - Date object
 * - ISO string or 'YYYY-MM-DD'
 * - Object { year, month, day }
 * 
 * Returns { year, month, day }
 */
export function toEthiopian(dateInput) {
  if (!dateInput) return null;
  let y, m, d;

  if (typeof dateInput === 'string') {
    // If it's a date-only string or ISO string, extract YYYY-MM-DD
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      y = parseInt(match[1], 10);
      m = parseInt(match[2], 10);
      d = parseInt(match[3], 10);
    } else {
      const parsed = new Date(dateInput);
      if (isNaN(parsed.getTime())) return null;
      // Convert to Addis Ababa timezone (UTC+3)
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

/**
 * Convert Ethiopian date { year, month, day } to Gregorian { year, month, day }.
 * Accepts (y, m, d) or ({ year, month, day })
 */
export function toGregorian(yearOrObj, maybeMonth, maybeDay) {
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
 * Helper to get Ethiopian month name in given locale ('om' | 'am' | 'en')
 */
export function getEthiopianMonthName(monthIndex1Based, lang = 'om') {
  const idx = Number(monthIndex1Based) - 1;
  if (idx < 0 || idx > 12) return '';
  const langKey = ['am', 'en', 'om'].includes(lang) ? lang : 'om';
  const entry = RAW_ETHIOPIAN_MONTHS[langKey]?.[idx] || ETHIOPIAN_MONTHS[langKey]?.[idx];
  return typeof entry === 'object' ? entry?.name : entry || '';
}

/**
 * Helper to get Ethiopian weekday name in given locale
 */
export function getEthiopianWeekdayName(weekdayIdx0to6, lang = 'om') {
  const langKey = ['am', 'en', 'om'].includes(lang) ? lang : 'om';
  const entry = ETHIOPIAN_WEEKDAYS[langKey][weekdayIdx0to6 % 7];
  return typeof entry === 'object' ? entry.name : entry;
}

/**
 * Helper to get Gregorian month name in given locale ('om' | 'am' | 'en')
 */
export function getGregorianMonthName(monthIndex1Based, lang = 'om') {
  const idx = Number(monthIndex1Based) - 1;
  if (idx < 0 || idx > 11) return '';
  const langKey = ['am', 'en', 'om'].includes(lang) ? lang : 'om';
  return GREGORIAN_MONTHS[langKey][idx];
}

/**
 * Ethiopian Clock Helpers
 * 
 * Rule:
 * Ethiopian clock starts at sunrise (06:00 standard time = 12:00 morning/day).
 * Ethiopian hour = ((h + 5) % 12) + 1
 * Day period: 06:00 - 17:59 (12:00 day to 11:59 day)
 * Night period: 18:00 - 05:59 (12:00 night to 11:59 night)
 */
export function toEthiopianClock(hour24, minute = 0) {
  const h = Number(hour24);
  const m = Number(minute);
  const ethHour = ((h + 5) % 12) + 1;
  const isDay = h >= 6 && h < 18;
  return {
    hour: ethHour,
    minute: m,
    isDay,
    period: isDay ? 'DAY' : 'NIGHT'
  };
}

/**
 * Convert Ethiopian clock time back to 24-hour standard hour
 */
export function fromEthiopianClock(ethHour, minute = 0, isDay = true) {
  const eh = Number(ethHour);
  const m = Number(minute);
  const base = eh % 12;
  const h = isDay ? base + 6 : (base + 18) % 24;
  return {
    hour: h,
    minute: m
  };
}

/**
 * Format Ethiopian clock for display
 */
export function formatEthiopianClock(hour24, minute = 0, lang = 'om') {
  const { hour, minute: m, isDay } = toEthiopianClock(hour24, minute);
  const minuteStr = String(m).padStart(2, '0');

  let periodText = '';
  if (lang === 'am') {
    periodText = isDay ? 'ቀን' : 'ምሽት/ሌሊት';
  } else if (lang === 'en') {
    periodText = isDay ? 'Day' : 'Night';
  } else {
    // Afaan Oromoo
    periodText = isDay ? 'Guyyaa' : 'Halkan';
  }

  return `${hour}:${minuteStr} (${periodText})`;
}
