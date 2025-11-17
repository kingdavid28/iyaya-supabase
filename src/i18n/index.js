import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { STRINGS } from '../constants/strings';

// Convert STRINGS object to i18n format
const resources = {
  en: {
    translation: STRINGS
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;