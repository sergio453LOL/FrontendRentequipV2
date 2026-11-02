import { CardCvcElement, CardExpiryElement, CardNumberElement, useElements, useStripe } from '@stripe/react-stripe-js'
import type { StripeElementChangeEvent } from '@stripe/stripe-js'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useTheme } from '../../hooks/useTheme'
import { useToast } from '../../hooks/useToast'
import { useZodForm } from '../../hooks/useZodForm'
import { Input } from '../common/Input'
import { PaymentActions } from './PaymentActions'
import type { PaymentFormProps } from './PaymentForm'
import { PaymentSummary } from './PaymentSummary'
import { StripeCardField } from './StripeCardField'
import { stripeElementStyle } from './stripeElementStyle'
import { usePayReservation } from './usePayReservation'

const holderSchema = z.object({
  holderName: z.string().trim().min(3, 'validation.holderName'),
})

type HolderValues = z.infer<typeof holderSchema>

type CardFieldName = 'number' | 'expiry' | 'cvc'

/** i18n keys, translated where the field shows them. */
const INCOMPLETE_MESSAGES: Record<CardFieldName, string> = {
  number: 'validation.cardNumberMissing',
  expiry: 'validation.cardExpiryMissing',
  cvc: 'validation.cardCvcMissing',
}

/** Stripe's published test cards. They can be typed into the form; they never move real money. */
const STRIPE_TEST_CARDS = [
  { number: '4242 4242 4242 4242', label: 'visaApproved' },
  { number: '5555 5555 5555 4444', label: 'mastercardApproved' },
  { number: '4000 0000 0000 9995', label: 'insufficientFunds' },
  { number: '4000 0000 0000 0002', label: 'declined' },
] as const


/**
 * Card checkout with Stripe Elements. The card fields are Stripe iframes, so the number never touches
 * RentEquip's code; Stripe.js returns a payment method id and only that id is sent to the backend.
 */
export function StripePaymentForm({ reservation, onPaid, onSkip }: PaymentFormProps) {
  const { t } = useTranslation()
  const stripe = useStripe()
  const elements = useElements()
  const toast = useToast()
  const { theme } = useTheme()
  // Recomputed on theme change; Stripe updates the iframes in place, keeping what was typed.
  const elementOptions = useMemo(() => ({ style: stripeElementStyle(theme) }), [theme])
  const payment = usePayReservation(reservation, onPaid)
  const [isTokenizing, setIsTokenizing] = useState(false)
  const [complete, setComplete] = useState<Record<CardFieldName, boolean>>({ number: false, expiry: false, cvc: false })
  const [cardErrors, setCardErrors] = useState<Partial<Record<CardFieldName, string>>>({})
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useZodForm(holderSchema, { defaultValues: { holderName: '' } })

  const isProcessing = isTokenizing || payment.isLoading

  function trackField(field: CardFieldName) {
    return (event: StripeElementChangeEvent) => {
      setComplete((current) => ({ ...current, [field]: event.complete }))
      setCardErrors((current) => ({ ...current, [field]: event.error?.message }))
    }
  }

  async function onSubmit(values: HolderValues) {
    const cardNumber = elements?.getElement(CardNumberElement)
    if (!stripe || !cardNumber) return

    const incomplete = (Object.keys(complete) as CardFieldName[]).filter((field) => !complete[field])
    if (incomplete.length > 0) {
      setCardErrors((current) => {
        const next = { ...current }
        for (const field of incomplete) next[field] ??= INCOMPLETE_MESSAGES[field]
        return next
      })
      return
    }

    setIsTokenizing(true)
    const { paymentMethod, error } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardNumber,
      billing_details: { name: values.holderName },
    })
    setIsTokenizing(false)

    if (error) {
      toast.error(t('payment.cardInvalid'), error.message ?? t('payment.cardInvalidText'))
      return
    }
    await payment.mutate(paymentMethod.id)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <PaymentSummary reservation={reservation} />

      <fieldset className="space-y-4" disabled={isProcessing}>
        <legend className="sr-only">{t('payment.cardLegend')}</legend>
        <Input label={t('payment.holder')} autoComplete="cc-name" placeholder="ANA PAZ" required error={errors.holderName?.message} {...register('holderName')} />
        <StripeCardField label={t('payment.cardNumber')} error={cardErrors.number} onChange={trackField('number')}>
          {(handlers) => (
            <CardNumberElement {...handlers} options={{ ...elementOptions, showIcon: true, disableLink: true, disabled: isProcessing }} />
          )}
        </StripeCardField>
        <div className="grid grid-cols-2 gap-4">
          <StripeCardField label={t('payment.expiry')} error={cardErrors.expiry} onChange={trackField('expiry')}>
            {(handlers) => <CardExpiryElement {...handlers} options={{ ...elementOptions, disabled: isProcessing }} />}
          </StripeCardField>
          <StripeCardField label="CVC" error={cardErrors.cvc} onChange={trackField('cvc')}>
            {(handlers) => <CardCvcElement {...handlers} options={{ ...elementOptions, disabled: isProcessing }} />}
          </StripeCardField>
        </div>
      </fieldset>

      <details className="rounded-lg border border-dashed border-slate-300 px-4 py-3 text-xs text-slate-600">
        <summary className="cursor-pointer font-medium text-slate-700">{t('payment.testCardsStripe')}</summary>
        <p className="mt-2">{t('payment.testCardsHintStripe')}</p>
        <ul className="mt-2 space-y-1">
          {STRIPE_TEST_CARDS.map((card) => (
            <li key={card.number}>
              <span className="num font-medium text-slate-800 select-all">{card.number}</span> · {t(`payment.cards.${card.label}`)}
            </li>
          ))}
        </ul>
      </details>

      <PaymentActions
        reservation={reservation}
        isProcessing={isProcessing || !stripe}
        securityNote={t('payment.stripeNote')}
        onSkip={onSkip}
      />
    </form>
  )
}
