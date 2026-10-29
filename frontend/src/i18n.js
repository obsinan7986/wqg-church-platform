import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import omTranslation from './locales/om.json';
import amTranslation from './locales/am.json';
import enTranslation from './locales/en.json';

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

export default i18n;
