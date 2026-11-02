import type { StripeElementStyle } from '@stripe/stripe-js'
import type { Theme } from '../../contexts/ThemeContextDefinition'

const FONT_FAMILY = '"IBM Plex Sans", Inter, ui-sans-serif, system-ui, sans-serif'

/**
 * Text styles inside Stripe's iframes, matched to the app's inputs. Tailwind classes and the dark-mode CSS
 * variables cannot reach into the iframe, so each theme passes its own colours.
 */
export function stripeElementStyle(theme: Theme): StripeElementStyle {
  const isDark = theme === 'dark'
  return {
    base: {
      color: isDark ? '#f1f5f9' : '#0f172a',
      iconColor: isDark ? '#aab5c5' : '#475569',
      fontFamily: FONT_FAMILY,
      fontSize: '14px',
      '::placeholder': { color: '#64748b' },
    },
    invalid: { color: isDark ? '#f87171' : '#dc2626', iconColor: isDark ? '#f87171' : '#dc2626' },
  }
}
