import { CalendarCheck, CalendarX } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useDebounce } from '../../hooks/useDebounce'
import { useFetch } from '../../hooks/useFetch'
import { useMutation } from '../../hooks/useMutation'
import { useZodForm } from '../../hooks/useZodForm'
import { PATHS } from '../../routes/paths'
import { ENDPOINTS } from '../../services/endpoints'
import { reservationService } from '../../services/reservationService'
import type { Availability, BlockedWindow, Equipment, Payment, Reservation } from '../../types'
import { currentLocale } from '../../i18n'
import { celebrate } from '../../utils/celebrate'
import { applyServerFieldErrors } from '../../utils/formErrors'
import { addDays, formatCurrency, parseIsoDate, rentalDays, toIsoDate, todayIso } from '../../utils/format'
import { cn } from '../../utils/cn'
import { Button } from '../common/Button'
import { crossesBlockedDays, firstFreeRange, rangeEnd, type DateSelection } from '../equipment/dateSelection'
import { Input } from '../common/Input'
import { Modal } from '../common/Modal'
import { Spinner } from '../common/Spinner'
import { Textarea } from '../common/Textarea'
import { ReservationPaymentForm } from '../payments/ReservationPaymentForm'
import { PaymentSuccess } from '../payments/PaymentSuccess'

const MAX_RENTAL_DAYS = 365
/** One-tap durations: a day, a few days, a week, two weeks and a month cover most site jobs. */
const DURATIONS = [1, 3, 7, 14, 30] as const
/** How far ahead the form looks for free days when it suggests dates (the backend serves up to 120 days). */
const LOOKAHEAD_DAYS = 119

/** "vie 28 nov" in the active language. */
function dayLabel(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString(currentLocale(), { weekday: 'short', day: 'numeric', month: 'short' }).replace(/[.,]/g, '')
}
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const reservationSchema = z
  .object({
    startDate: z
      .string()
      .regex(ISO_DATE, 'validation.startDateRequired')
      .refine((value) => value >= todayIso(), 'validation.startDatePast'),
    endDate: z.string().regex(ISO_DATE, 'validation.endDateRequired'),
    notes: z.string().max(500, 'validation.max500'),
  })
  .refine((values) => values.endDate >= values.startDate, {
    path: ['endDate'],
    message: 'validation.endBeforeStart',
  })
  .refine((values) => rentalDays(values.startDate, values.endDate) <= MAX_RENTAL_DAYS, {
    path: ['endDate'],
    message: 'validation.maxRentalDays',
  })

type ReservationFormValues = z.infer<typeof reservationSchema>

type CheckoutStep =
  | { name: 'details' }
  | { name: 'payment'; reservation: Reservation }
  | { name: 'paid'; reservation: Reservation; payments: Payment[] }

const STEP_NUMBERS: Record<CheckoutStep['name'], number> = { details: 1, payment: 2, paid: 3 }

interface ReservationRequestModalProps {
  equipment: Equipment
  isOpen: boolean
  onClose: () => void
  /** Dates already picked on the availability calendar; the form opens with them filled in. */
  initialDates?: DateSelection
  /** A price agreed in a negotiation: it replaces the published daily rate. */
  agreedOffer?: { id: number; dailyRate: number }
  /** Days on the page's quick quote: without calendar dates the form proposes the first free stretch this long. */
  suggestedDays?: number
}

export function ReservationRequestModal({ equipment, isOpen, onClose, initialDates, agreedOffer, suggestedDays = 3 }: ReservationRequestModalProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [step, setStep] = useState<CheckoutStep>({ name: 'details' })
  const {
    register,
    handleSubmit,
    watch,
    reset,
    getValues,
    setValue,
    setError,
    formState: { errors },
  } = useZodForm(reservationSchema, { defaultValues: { startDate: '', endDate: '', notes: '' } })

  // Booked and pending days of the next months, to propose dates that are really free.
  const today = todayIso()
  const blocked = useFetch<BlockedWindow[]>(isOpen ? ENDPOINTS.equipmentBlockedDates(equipment.id) : null, {
    from: today,
    until: toIsoDate(addDays(parseIsoDate(today), LOOKAHEAD_DAYS)),
  })
  // If the calendar feed fails the form still proposes dates; the availability check below has the last word.
  const blockedFailed = blocked.error !== null
  const windows = useMemo(() => blocked.data ?? (blockedFailed ? [] : null), [blocked.data, blockedFailed])

  // Each time the form opens it takes the dates chosen on the calendar, keeping any note already typed. Without
  // them it proposes the first free stretch as long as the page's quote, from tomorrow (delivery takes a day).
  const initialStart = initialDates?.startDate ?? ''
  const initialEnd = initialDates?.endDate ?? ''
  // Proposed once per opening, so the visitor's own changes are never overwritten.
  const hasProposed = useRef(false)
  useEffect(() => {
    if (!isOpen) {
      hasProposed.current = false
      return
    }
    if (initialStart && initialEnd) {
      reset({ startDate: initialStart, endDate: initialEnd, notes: getValues('notes') })
      return
    }
    if (!windows || hasProposed.current) return
    const tomorrow = toIsoDate(addDays(parseIsoDate(todayIso()), 1))
    const proposal = firstFreeRange(suggestedDays, windows, initialStart || tomorrow)
    if (proposal) reset({ ...proposal, notes: getValues('notes') })
    hasProposed.current = true
  }, [isOpen, initialStart, initialEnd, windows, suggestedDays, reset, getValues])

  /** A duration chip: keeps the start when the stretch fits there, else moves to the first free one. */
  function chooseDuration(length: number) {
    const tomorrow = toIsoDate(addDays(parseIsoDate(todayIso()), 1))
    const currentStart = ISO_DATE.test(getValues('startDate')) && getValues('startDate') >= todayIso() ? getValues('startDate') : null
    const fitsHere = currentStart !== null && !crossesBlockedDays(currentStart, rangeEnd(currentStart, length), windows ?? [])
    const range = fitsHere ? { startDate: currentStart, endDate: rangeEnd(currentStart, length) } : firstFreeRange(length, windows ?? [], currentStart ?? tomorrow)
    if (!range) return
    setValue('startDate', range.startDate, { shouldValidate: true, shouldDirty: true })
    setValue('endDate', range.endDate, { shouldValidate: true, shouldDirty: true })
  }

  const startDate = watch('startDate')
  const endDate = watch('endDate')
  const notesLength = watch('notes').length
  const datesAreValid =
    ISO_DATE.test(startDate) && ISO_DATE.test(endDate) && startDate >= todayIso() && endDate >= startDate
  const days = datesAreValid ? rentalDays(startDate, endDate) : 0

  const debouncedRange = useDebounce(datesAreValid ? `${startDate}|${endDate}` : null, 300)
  const [checkStart, checkEnd] = debouncedRange?.split('|') ?? []
  const availability = useFetch<Availability>(
    debouncedRange && isOpen ? ENDPOINTS.availability : null,
    { equipmentId: equipment.id, startDate: checkStart, endDate: checkEnd },
  )
  const isCheckingAvailability =
    datesAreValid && (availability.isLoading || debouncedRange !== `${startDate}|${endDate}`)
  const isUnavailable = datesAreValid && !isCheckingAvailability && availability.data?.available === false

  const createReservation = useMutation(reservationService.create, {
    successMessage: t('reservation.created'),
    errorTitle: t('reservation.createFailed'),
    onSuccess: (reservation) => {
      celebrate()
      setStep({ name: 'payment', reservation })
    },
    onError: (error) => applyServerFieldErrors(error, setError),
  })

  async function onSubmit(values: ReservationFormValues) {
    await createReservation.mutate({
      equipmentId: equipment.id,
      startDate: values.startDate,
      endDate: values.endDate,
      notes: values.notes.trim() || undefined,
      offerId: agreedOffer?.id,
    })
  }

  const dailyRate = agreedOffer?.dailyRate ?? equipment.dailyRate
  const rentalAmount = days * dailyRate

  /** Once the reservation exists, closing the modal takes the user to it, paid or not. */
  function handleClose() {
    if (step.name === 'details') {
      onClose()
      return
    }
    reset()
    setStep({ name: 'details' })
    onClose()
    navigate(`${PATHS.reservations}?role=RENTER`)
  }

  if (step.name !== 'details') {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title={t(`reservation.steps.${step.name}`)}>
        <p className="mb-4 text-[13px] font-medium text-slate-600">{t('reservation.stepOf', { n: STEP_NUMBERS[step.name] })}</p>
        {step.name === 'payment' ? (
          <ReservationPaymentForm
            reservation={step.reservation}
            onSkip={handleClose}
            onPaid={(payments) =>
              setStep({ name: 'paid', reservation: { ...step.reservation, paymentStatus: 'PAID' }, payments })
            }
          />
        ) : (
          <PaymentSuccess reservation={step.reservation} payments={step.payments} onDone={handleClose} doneLabel={t('reservation.viewMine')} />
        )}
      </Modal>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('reservation.steps.details')}
      isDismissable={!createReservation.isLoading}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={createReservation.isLoading}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            variant="action"
            form="reservation-form"
            isLoading={createReservation.isLoading}
            disabled={isUnavailable || isCheckingAvailability}
          >
            {t('reservation.send')}
          </Button>
        </>
      }
    >
      <p className="mb-4 text-[13px] font-medium text-slate-600">{t('reservation.stepOf', { n: 1 })}</p>
      <form id="reservation-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <p className="text-sm text-slate-600">
          <Trans
            i18nKey="reservation.requesting"
            values={{ name: equipment.name }}
            components={{ b: <span className="font-semibold text-slate-900" /> }}
          />
        </p>

        <fieldset>
          <legend className="text-sm font-medium text-slate-800">{t('reservation.howLong')}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {DURATIONS.map((length) => (
              <button
                key={length}
                type="button"
                onClick={() => chooseDuration(length)}
                aria-pressed={datesAreValid && days === length}
                className={cn(
                  'h-9 rounded-full px-3.5 text-sm font-semibold transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                  datesAreValid && days === length
                    ? 'bg-ink text-white'
                    : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:ring-slate-400',
                )}
              >
                {t(`reservation.durations.d${length}`)}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={t('reservation.startDate')} type="date" min={todayIso()} required error={errors.startDate?.message} {...register('startDate')} />
          <Input
            label={t('reservation.endDate')}
            type="date"
            min={startDate || todayIso()}
            required
            error={errors.endDate?.message}
            {...register('endDate')}
          />
        </div>

        {datesAreValid && (
          <div aria-live="polite" className="space-y-1.5 text-sm">
            <p className="font-semibold text-slate-900">
              {t('reservation.rangeSummary', { from: dayLabel(startDate), to: dayLabel(endDate), days: t('common.day', { count: days }) })}
            </p>
            {isCheckingAvailability && (
              <p className="flex items-center gap-2 text-slate-500">
                <Spinner size="sm" label={t('reservation.checking')} /> {t('reservation.checkingDots')}
              </p>
            )}
            {!isCheckingAvailability && availability.data?.available === true && (
              <p className="flex items-center gap-2 font-medium text-emerald-700">
                <CalendarCheck className="size-4" aria-hidden="true" /> {t('reservation.available')}
              </p>
            )}
            {isUnavailable && (
              <p className="flex items-center gap-2 font-medium text-red-700">
                <CalendarX className="size-4" aria-hidden="true" /> {t('reservation.unavailable')}
              </p>
            )}
            {!isCheckingAvailability && availability.error && (
              <p className="text-amber-700">{t('reservation.checkFailed', { message: availability.error.message })}</p>
            )}
          </div>
        )}

        <Textarea
          label={t('reservation.notes')}
          placeholder={t('reservation.notesPlaceholder')}
          maxLength={500}
          hint={`${notesLength}/500`}
          error={errors.notes?.message}
          {...register('notes')}
        />

        <dl className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">
              {datesAreValid
                ? t('reservation.rentalLine', { rate: formatCurrency(dailyRate, equipment.currency), days: t('common.day', { count: days }) })
                : t('reservation.pickDates', { rate: formatCurrency(dailyRate, equipment.currency) })}
            </dt>
            <dd className="font-medium text-slate-900">{datesAreValid ? formatCurrency(rentalAmount, equipment.currency) : '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">{t('reservation.deposit')}</dt>
            <dd className="font-medium text-slate-900">{formatCurrency(equipment.securityDeposit, equipment.currency)}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
            <dt className="font-semibold text-slate-900">{t('reservation.estimatedTotal')}</dt>
            <dd className="font-semibold text-slate-900">
              {datesAreValid ? formatCurrency(rentalAmount + equipment.securityDeposit, equipment.currency) : '—'}
            </dd>
          </div>
        </dl>
      </form>
    </Modal>
  )
}
