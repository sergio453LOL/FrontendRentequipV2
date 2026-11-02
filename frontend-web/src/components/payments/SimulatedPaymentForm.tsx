import { CreditCard } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useZodForm } from '../../hooks/useZodForm'
import {
  createCardToken,
  detectCardBrand,
  formatCardNumber,
  formatExpiry,
  isValidExpiry,
  passesLuhn,
  TEST_CARDS,
} from '../../services/cardTokenizer'
import { Input } from '../common/Input'
import { PaymentActions } from './PaymentActions'
import type { PaymentFormProps } from './PaymentForm'
import { PaymentSummary } from './PaymentSummary'
import { usePayReservation } from './usePayReservation'

const cardSchema = z.object({
  holderName: z.string().trim().min(3, 'validation.holderName'),
  number: z.string().refine(passesLuhn, 'validation.cardNumber'),
  expiry: z.string().refine((value) => isValidExpiry(value), 'validation.cardExpiry'),
  cvc: z.string().regex(/^\d{3,4}$/, 'validation.cardCvc'),
})

type CardFormValues = z.infer<typeof cardSchema>

const BRAND_LABELS = { visa: 'VISA', mastercard: 'Mastercard', amex: 'AMEX', unknown: '' } as const

/**
 * Card checkout used when no Stripe publishable key is configured. The card is tokenized in the browser by
 * a sandbox that mimics Stripe.js, and only the token is sent to the backend.
 */
export function SimulatedPaymentForm({ reservation, onPaid, onSkip }: PaymentFormProps) {
  const { t } = useTranslation()
  const [isTokenizing, setIsTokenizing] = useState(false)
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useZodForm(cardSchema, { defaultValues: { holderName: '', number: '', expiry: '', cvc: '' } })

  const brand = detectCardBrand(watch('number'))
  const payment = usePayReservation(reservation, onPaid)

  const numberField = register('number')
  const expiryField = register('expiry')
  const isProcessing = isTokenizing || payment.isLoading

  async function onSubmit(values: CardFormValues) {
    setIsTokenizing(true)
    const token = await createCardToken(values)
    setIsTokenizing(false)
    await payment.mutate(token)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <PaymentSummary reservation={reservation} />

      <fieldset className="space-y-4" disabled={isProcessing}>
        <legend className="sr-only">{t('payment.cardLegend')}</legend>
        <Input label={t('payment.holder')} autoComplete="cc-name" placeholder="ANA PAZ" required error={errors.holderName?.message} {...register('holderName')} />
        <div className="relative">
          <Input
            label={t('payment.cardNumber')}
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="4242 4242 4242 4242"
            required
            leftIcon={<CreditCard className="size-4" />}
            error={errors.number?.message}
            {...numberField}
            onChange={(event) => {
              setValue('number', formatCardNumber(event.target.value), { shouldValidate: Boolean(errors.number) })
            }}
          />
          {brand !== 'unknown' && (
            <span className="absolute top-9 right-3 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white">
              {BRAND_LABELS[brand]}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('payment.expiry')}
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder={t('payment.expiryPlaceholder')}
            required
            error={errors.expiry?.message}
            {...expiryField}
            onChange={(event) => {
              setValue('expiry', formatExpiry(event.target.value), { shouldValidate: Boolean(errors.expiry) })
            }}
          />
          <Input label="CVC" inputMode="numeric" autoComplete="cc-csc" placeholder="123" maxLength={4} required error={errors.cvc?.message} {...register('cvc')} />
        </div>
      </fieldset>

      <details className="rounded-lg border border-dashed border-slate-300 px-4 py-3 text-xs text-slate-600">
        <summary className="cursor-pointer font-medium text-slate-700">{t('payment.testCards')}</summary>
        <p className="mt-2">{t('payment.testCardsHint')}</p>
        <ul className="mt-2 space-y-1">
          {TEST_CARDS.map((card) => (
            <li key={card.number}>
              <button
                type="button"
                onClick={() => setValue('number', card.number, { shouldValidate: true })}
                className="num text-accent-ink hover:underline"
              >
                {card.number}
              </button>{' '}
              · {t(`payment.cards.${card.label}`)}
            </li>
          ))}
        </ul>
      </details>

      <PaymentActions
        reservation={reservation}
        isProcessing={isProcessing}
        securityNote={t('payment.simulatedNote')}
        onSkip={onSkip}
      />
    </form>
  )
}
