import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { GOOGLE_CLIENT_ID as CLIENT_ID } from '../../utils/googleSignIn'

const SCRIPT_URL = 'https://accounts.google.com/gsi/client'
const BUTTON_MAX_WIDTH = 400

interface GoogleCredentialResponse {
  credential: string
}

interface GoogleAccountsId {
  initialize: (options: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
    ux_mode?: 'popup' | 'redirect'
  }) => void
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: 'standard' | 'icon'
      theme?: 'outline' | 'filled_blue' | 'filled_black'
      size?: 'large' | 'medium' | 'small'
      text?: 'signin_with' | 'signup_with' | 'continue_with'
      shape?: 'rectangular' | 'pill'
      logo_alignment?: 'left' | 'center'
      width?: number
      locale?: string
    },
  ) => void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } }
  }
}

let scriptPromise: Promise<GoogleAccountsId> | null = null

/** Google Identity Services is loaded once, the first time a button is shown. */
function loadGoogleIdentity(): Promise<GoogleAccountsId> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id)
  scriptPromise ??= new Promise<GoogleAccountsId>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => (window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error('GIS missing')))
    script.onerror = () => {
      scriptPromise = null
      script.remove()
      reject(new Error('GIS failed to load'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

/**
 * Google allows a single `initialize` per page, with one callback. It forwards to whichever button is on
 * screen now, so moving between the login and the sign-up page keeps working.
 */
let initialized = false
let activeHandler: ((credential: string) => void) | null = null

const GOOGLE_LOCALES: Record<string, string> = { es: 'es-419', en: 'en', zh: 'zh-CN' }

/** Google's own button (its branding rules ask for it), sized to the form and in the page's language. */
export function GoogleSignInButton({
  text,
  onCredential,
  onLoadError,
}: {
  text: 'signin_with' | 'signup_with' | 'continue_with'
  onCredential: (credential: string) => void
  onLoadError?: () => void
}) {
  const { i18n } = useTranslation()
  const container = useRef<HTMLDivElement>(null)
  const handler = useRef(onCredential)
  const loadError = useRef(onLoadError)

  useEffect(() => {
    handler.current = onCredential
    loadError.current = onLoadError
  })

  useEffect(() => {
    const clientId = CLIENT_ID
    if (!clientId) return
    let cancelled = false
    loadGoogleIdentity()
      .then((google) => {
        const parent = container.current
        if (cancelled || !parent) return
        if (!initialized) {
          google.initialize({ client_id: clientId, callback: (response) => activeHandler?.(response.credential), ux_mode: 'popup' })
          initialized = true
        }
        activeHandler = (credential) => handler.current(credential)
        parent.replaceChildren()
        google.renderButton(parent, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          shape: 'rectangular',
          logo_alignment: 'center',
          width: Math.min(BUTTON_MAX_WIDTH, Math.max(200, Math.floor(parent.clientWidth))),
          locale: GOOGLE_LOCALES[i18n.language.slice(0, 2)] ?? 'es-419',
        })
      })
      .catch(() => {
        if (!cancelled) loadError.current?.()
      })
    return () => {
      cancelled = true
    }
  }, [text, i18n.language])

  if (!CLIENT_ID) return null
  // Google's iframe is 40px tall; the box keeps the layout still while it loads.
  return <div ref={container} className="flex min-h-11 w-full items-center justify-center" />
}

/** Thin rule with a word in the middle, between the email form and the Google button. */
export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-slate-500" role="separator">
      <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
      {label}
      <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
    </div>
  )
}
