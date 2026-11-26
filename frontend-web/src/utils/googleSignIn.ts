import type { GoogleSignup, TwoFactorChallenge } from '../types'
import { ApiError } from './apiError'

/** The web client id from Google Cloud. Without it the Google button is not shown at all. */
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()
export const isGoogleSignInEnabled = Boolean(GOOGLE_CLIENT_ID)

/**
 * Reads the name and email from the Google credential to pre-fill the sign-up. Unverified on purpose: it is
 * only a convenience for the form, and the backend checks the signature before trusting any of it.
 */
export function readGoogleSignup(credential: string): GoogleSignup {
  try {
    const payload = credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')), (char) => char.charCodeAt(0))
    const claims = JSON.parse(new TextDecoder().decode(bytes)) as { email?: string; given_name?: string; family_name?: string }
    return { credential, email: claims.email ?? '', firstName: claims.given_name ?? '', lastName: claims.family_name ?? '' }
  } catch {
    return { credential, email: '', firstName: '', lastName: '' }
  }
}

export type GoogleOutcome =
  | { kind: 'signedIn' }
  | { kind: 'challenge'; challenge: TwoFactorChallenge }
  | { kind: 'signup'; signup: GoogleSignup }

/** One Google login, three endings: signed in, a two-step code sent, or no account yet (go sign up). */
export async function continueWithGoogle(
  credential: string,
  loginWithGoogle: (credential: string) => Promise<TwoFactorChallenge | null>,
): Promise<GoogleOutcome> {
  try {
    const challenge = await loginWithGoogle(credential)
    return challenge ? { kind: 'challenge', challenge } : { kind: 'signedIn' }
  } catch (error) {
    if (ApiError.from(error).code === 'GOOGLE_ACCOUNT_NOT_REGISTERED') {
      return { kind: 'signup', signup: readGoogleSignup(credential) }
    }
    throw error
  }
}
