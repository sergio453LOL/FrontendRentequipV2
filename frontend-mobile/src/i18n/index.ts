import * as SecureStore from 'expo-secure-store'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from './en'
import { es } from './es'
import { zh } from './zh'

/** Spanish first (the marketplace's language), then English and Simplified Chinese for foreign companies. */
export const LANGUAGES = ['es', 'en', 'zh'] as const
export type Language = (typeof LANGUAGES)[number]

const STORAGE_KEY = 'rentequip.language'

/** BCP 47 tag for Intl numbers and the native date picker. */
const LOCALES: Record<Language, string> = { es: 'es-PE', en: 'en-US', zh: 'zh-CN' }

function isLanguage(value: string | null | undefined): value is Language {
  return (LANGUAGES as readonly string[]).includes(value ?? '')
}

/** The phone's language when it is one we have, Spanish otherwise. */
function deviceLanguage(): Language {
  try {
    const language = Intl.DateTimeFormat().resolvedOptions().locale.split('-')[0]
    return isLanguage(language) ? language : 'es'
  } catch {
    return 'es'
  }
}

void i18n.use(initReactI18next).init({
  resources: { es: { translation: es }, en: { translation: en }, zh: { translation: zh } },
  lng: deviceLanguage(),
  fallbackLng: 'es',
  // React Native renders text, not HTML: nothing to escape.
  interpolation: { escapeValue: false },
  returnNull: false,
})

/** A language the user picked before wins over the phone's; SecureStore is async, so it applies right after start. */
SecureStore.getItemAsync(STORAGE_KEY)
  .then((stored) => {
    if (isLanguage(stored) && stored !== i18n.language) void i18n.changeLanguage(stored)
  })
  .catch(() => {
    // Unreadable storage: keep the phone's language.
  })

export function changeLanguage(language: Language): void {
  void i18n.changeLanguage(language)
  SecureStore.setItemAsync(STORAGE_KEY, language).catch(() => {
    // The language still applies until the app is closed.
  })
}

export function currentLanguage(): Language {
  return isLanguage(i18n.language) ? i18n.language : 'es'
}

/** Locale for Intl numbers and the native date picker: Peruvian Spanish, US English or mainland Chinese. */
export function currentLocale(): string {
  return LOCALES[currentLanguage()]
}

/**
 * Form messages are i18n keys when they come from our Zod schemas ("validation.emailRequired") and plain
 * text when they come from the backend: translate the former, show the latter as they are.
 */
export function translateMessage(message: string | undefined): string | undefined {
  if (!message || !i18n.exists(message)) return message
  return i18n.t(message as never)
}

export default i18n
