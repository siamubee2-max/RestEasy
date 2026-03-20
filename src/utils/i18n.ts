import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from '../i18n/locales/en.json';
import fr from '../i18n/locales/fr.json';
import es from '../i18n/locales/es.json';
import de from '../i18n/locales/de.json';
import pt from '../i18n/locales/pt.json';

const SUPPORTED_LANGUAGES = ['fr', 'en', 'es', 'de', 'pt'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

function detectLanguage(): SupportedLanguage {
  const deviceLocales = Localization.getLocales();

  for (const locale of deviceLocales) {
    const code = locale.languageCode as SupportedLanguage;
    if (SUPPORTED_LANGUAGES.includes(code)) {
      return code;
    }
  }

  return 'en';
}

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      es: { translation: es },
      de: { translation: de },
      pt: { translation: pt },
    },
    lng: detectLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  fr: '🇫🇷 Français',
  en: '🇬🇧 English',
  es: '🇪🇸 Español',
  de: '🇩🇪 Deutsch',
  pt: '🇧🇷 Português',
};

export default i18n;
