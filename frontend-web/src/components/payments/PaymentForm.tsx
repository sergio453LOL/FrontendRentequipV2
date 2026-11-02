import { Elements } from '@stripe/react-stripe-js'
import type { StripeElementsOptions } from '@stripe/stripe-js'
import { useTranslation } from 'react-i18next'
import { currentLanguage } from '../../i18n'
import { getStripe, isStripeEnabled } from '../../services/stripeClient'
import type { Payment, Reservation } from '../../types'
import { SimulatedPaymentForm } from './SimulatedPaymentForm'
import { StripePaymentForm } from './StripePaymentForm'

export interface PaymentFormProps {
  reservation: Reservation
  onPaid: (payments: Payment[]) => void
  /** Optional secondary action, e.g. "Pagar después" in the booking flow. */
  onSkip?: () => void
}

const ELEMENTS_OPTIONS: StripeElementsOptions = {
  fonts: [{ cssSrc: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500&display=swap' }],
}

/** Card checkout: Stripe Elements when a publishable key is configured, the simulated form otherwise. */
export function PaymentForm(props: PaymentFormProps) {
  useTranslation() // re-render on language change
  const locale = currentLanguage()
  if (!isStripeEnabled) {
    return <SimulatedPaymentForm {...props} />
  }
  return (
    // Stripe reads the locale only when Elements mounts: a new key remounts it in the new language.
    <Elements key={locale} stripe={getStripe()} options={{ ...ELEMENTS_OPTIONS, locale }}>
      <StripePaymentForm {...props} />
    </Elements>
  )
}
