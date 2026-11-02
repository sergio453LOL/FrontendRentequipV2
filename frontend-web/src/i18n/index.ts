import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from './en'
import { es } from './es'
import { zh } from './zh'

/** Spanish first (the marketplace's language), then English and Simplified Chinese for foreign companies. */
export const LANGUAGES = ['es', 'en', 'zh'] as const
export type Language = (typeof LANGUAGES)[number]

/** Same key the inline script in index.html reads, so <html lang> is right from the first paint. */
const STORAGE_KEY = 'rentequip.language'

/** BCP 47 tag for <html lang> and for Intl dates and numbers. */
const LOCALES: Record<Language, string> = { es: 'es-PE', en: 'en-US', zh: 'zh-CN' }

function isLanguage(value: string | null): value is Language {
  return (LANGUAGES as readonly string[]).includes(value ?? '')
}

function readInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isLanguage(stored)) return stored
  } catch {
    // Blocked storage: Spanish, the marketplace's language.
  }
  return 'es'
}

i18n.use(initReactI18next).init({
  resources: { es: { translation: es }, en: { translation: en }, zh: { translation: zh } },
  lng: readInitialLanguage(),
  fallbackLng: 'es',
  // React already escapes what it renders.
  interpolation: { escapeValue: false },
  returnNull: false,
})

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = isLanguage(language) ? LOCALES[language] : language
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // Private mode or blocked storage: the language still applies for this visit.
  }
})

export function currentLanguage(): Language {
  return isLanguage(i18n.language) ? i18n.language : 'es'
}

/** Locale for Intl dates and numbers: Peruvian Spanish, US English or mainland Chinese. */
export function currentLocale(): string {
  return LOCALES[currentLanguage()]
}

export default i18n
