import { loadStripe, type Stripe } from '@stripe/stripe-js'

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

/** Without a publishable key the checkout falls back to the simulated card form. */
export const isStripeEnabled = Boolean(publishableKey)

let stripePromise: Promise<Stripe | null> | null = null

/** Loads Stripe.js once, the first time a checkout is opened, instead of on every page. */
export function getStripe(): Promise<Stripe | null> {
  stripePromise ??= loadStripe(publishableKey ?? '')
  return stripePromise
}
