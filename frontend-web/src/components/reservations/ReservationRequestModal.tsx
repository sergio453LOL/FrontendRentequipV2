import { CalendarCheck, CalendarX } from 'lucide-react'
import { useEffect, useState } from 'react'
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
import type { Availability, Equipment, Payment, Reservation } from '../../types'
import { celebrate } from '../../utils/celebrate'
import { applyServerFieldErrors } from '../../utils/formErrors'
import { formatCurrency, rentalDays, todayIso } from '../../utils/format'
import { Button } from '../common/Button'
import type { DateSelection } from '../equipment/dateSelection'
import { Input } from '../common/Input'
import { Modal } from '../common/Modal'
import { Spinner } from '../common/Spinner'
import { Textarea } from '../common/Textarea'
import { PaymentForm } from '../payments/PaymentForm'
import { PaymentSuccess } from '../payments/PaymentSuccess'

const MAX_RENTAL_DAYS = 365
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
}

export function ReservationRequestModal({ equipment, isOpen, onClose, initialDates }: ReservationRequestModalProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [step, setStep] = useState<CheckoutStep>({ name: 'details' })
  const {
    register,
    handleSubmit,
    watch,
    reset,
    getValues,
    setError,
    formState: { errors },
  } = useZodForm(reservationSchema, { defaultValues: { startDate: '', endDate: '', notes: '' } })

  // Each time the form opens it takes the dates chosen on the calendar, keeping any note already typed.
  const initialStart = initialDates?.startDate ?? ''
  const initialEnd = initialDates?.endDate ?? ''
  useEffect(() => {
    if (!isOpen || (!initialStart && !initialEnd)) return
    reset({ startDate: initialStart, endDate: initialEnd, notes: getValues('notes') })
  }, [isOpen, initialStart, initialEnd, reset, getValues])

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
    })
  }

  const rentalAmount = days * equipment.dailyRate

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
          <PaymentForm
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
          <div aria-live="polite" className="text-sm">
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
              {t('reservation.rentalLine', { rate: formatCurrency(equipment.dailyRate, equipment.currency), days: t('common.day', { count: days }) })}
            </dt>
            <dd className="font-medium text-slate-900">{formatCurrency(rentalAmount, equipment.currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">{t('reservation.deposit')}</dt>
            <dd className="font-medium text-slate-900">{formatCurrency(equipment.securityDeposit, equipment.currency)}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
            <dt className="font-semibold text-slate-900">{t('reservation.estimatedTotal')}</dt>
            <dd className="font-semibold text-slate-900">
              {formatCurrency(rentalAmount + equipment.securityDeposit, equipment.currency)}
            </dd>
          </div>
        </dl>
      </form>
    </Modal>
  )
}
