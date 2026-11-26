/**
 * reCAPTCHA v3: invisible, it scores how human the visitor looks while they use the page and hands a token
 * for each protected action, which the backend checks with Google. Without VITE_RECAPTCHA_SITE_KEY nothing
 * loads and no token is sent.
 */
const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim()
export const isRecaptchaEnabled = Boolean(SITE_KEY)

interface Grecaptcha {
  ready: (callback: () => void) => void
  execute: (siteKey: string, options: { action: string }) => Promise<string>
}

declare global {
  interface Window {
    grecaptcha?: Grecaptcha
  }
}

let loading: Promise<Grecaptcha> | null = null

/** Loads Google's script once. Called when the login page opens, so it has time to observe the visitor. */
export function loadRecaptcha(): Promise<Grecaptcha | null> {
  if (!SITE_KEY) return Promise.resolve(null)
  loading ??= new Promise<Grecaptcha>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(SITE_KEY)}`
    script.async = true
    script.onload = () => {
      const grecaptcha = window.grecaptcha
      if (grecaptcha) grecaptcha.ready(() => resolve(grecaptcha))
      else reject(new Error('reCAPTCHA missing'))
    }
    script.onerror = () => {
      loading = null
      script.remove()
      reject(new Error('reCAPTCHA failed to load'))
    }
    document.head.appendChild(script)
  })
  return loading
}

/**
 * A fresh token for `action` (tokens last two minutes and work once, so each attempt asks for its own).
 * Resolves to undefined when reCAPTCHA is off or Google could not be loaded: the backend then decides.
 */
export async function recaptchaToken(action: string): Promise<string | undefined> {
  if (!SITE_KEY) return undefined
  try {
    const grecaptcha = await loadRecaptcha()
    return grecaptcha ? await grecaptcha.execute(SITE_KEY, { action }) : undefined
  } catch {
    return undefined
  }
}
