import 'i18next'
import type { es } from './es'

// Spanish is the source of truth: every t('...') key is checked against it at compile time.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: { translation: typeof es }
    returnNull: false
  }
}
