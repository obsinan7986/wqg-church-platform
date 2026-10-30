import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import api from './api/axios';

import omTranslation from './locales/om.json';
import amTranslation from './locales/am.json';
import enTranslation from './locales/en.json';

export const defaultLocales = {
  om: omTranslation,
  am: amTranslation,
  en: enTranslation
};

const savedLanguage = localStorage.getItem('wqg_lang') || 'om';
if (typeof document !== 'undefined') {
  document.documentElement.lang = savedLanguage;
}

const resources = {
  om: { translation: omTranslation },
  am: { translation: amTranslation },
  en: { translation: enTranslation }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    }
  });

i18n.on('languageChanged', (lng) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
  }
});

export const changeLanguage = (lng) => {
  i18n.changeLanguage(lng);
  localStorage.setItem('wqg_lang', lng);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
  }
};

/**
 * Deeply sets a value at dot-separated path in an object
 */
function setNestedKey(obj, path, value) {
  if (!path) return;
  const parts = path.split('.');
  let curr = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!curr[part] || typeof curr[part] !== 'object' || Array.isArray(curr[part])) {
      curr[part] = {};
    }
    curr = curr[part];
  }
  curr[parts[parts.length - 1]] = value;
}

/**
 * Merges site text overrides from DB into i18next using addResourceBundle (deep + overwrite)
 * @param {Array} overrides Array of SiteText documents { key, om, am, en }
 */
export const applySiteTextOverrides = (overrides) => {
  if (!Array.isArray(overrides) || overrides.length === 0) return;

  const bundles = { om: {}, am: {}, en: {} };

  overrides.forEach((item) => {
    if (!item || !item.key) return;
    if (typeof item.om === 'string' && item.om.trim() !== '') {
      setNestedKey(bundles.om, item.key, item.om);
    }
    if (typeof item.am === 'string' && item.am.trim() !== '') {
      setNestedKey(bundles.am, item.key, item.am);
    }
    if (typeof item.en === 'string' && item.en.trim() !== '') {
      setNestedKey(bundles.en, item.key, item.en);
    }
  });

  ['om', 'am', 'en'].forEach((lng) => {
    if (Object.keys(bundles[lng]).length > 0) {
      // addResourceBundle with deep merge (deep: true) and overwrite (overwrite: true)
      i18n.addResourceBundle(lng, 'translation', bundles[lng], true, true);
    }
  });

  // Notify react-i18next to refresh active components with new translation strings
  i18n.emit('languageChanged', i18n.language);
};

/**
 * Fetches overrides from GET /api/site-text and merges them into i18next
 */
export const fetchAndApplySiteTextOverrides = async () => {
  try {
    const res = await api.get('/site-text');
    if (res.data?.success && Array.isArray(res.data.data)) {
      applySiteTextOverrides(res.data.data);
      return res.data.data;
    }
  } catch (err) {
    // Non-blocking fallback to default bundled JSONs
    console.debug('[i18n] Fallback to default translations:', err.message);
  }
  return [];
};

// Automatically attempt to fetch and merge overrides on initial script load
if (typeof window !== 'undefined') {
  // Fire asynchronously so it doesn't block bundle initialization
  setTimeout(() => {
    fetchAndApplySiteTextOverrides();
  }, 100);
}

export default i18n;
