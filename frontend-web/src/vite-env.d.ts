/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string
  /** Backend origin (https://host) when VITE_API_URL goes through the Vercel proxy as /api/v1. */
  readonly VITE_BACKEND_ORIGIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
