import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// For this prototype, we'll embed the translations.
// In a larger app, use i18next-http-backend.

const resources = {
  en: {
    translation: {
      "app": {
        "title": "Enterprise AI Interaction Security Gateway",
        "navigation": {
          "overview": "Overview",
          "requests": "Requests",
          "findings": "Findings",
          "policies": "Policies",
          "users": "Users",
          "settings": "Settings"
        }
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
