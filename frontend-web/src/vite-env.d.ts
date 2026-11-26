/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string
  /** Backend origin (https://host) when VITE_API_URL goes through the Vercel proxy as /api/v1. */
  readonly VITE_BACKEND_ORIGIN?: string
  /** Google Cloud OAuth web client id for "Continuar con Google"; without it the button is hidden. */
  readonly VITE_GOOGLE_CLIENT_ID?: string
  /** reCAPTCHA v3 site key (public) for the login; without it no reCAPTCHA is loaded. */
  readonly VITE_RECAPTCHA_SITE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
