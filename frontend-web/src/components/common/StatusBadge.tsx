import type { EquipmentStatus, ReservationPaymentStatus, ReservationStatus } from '../../types'
import { cn } from '../../utils/cn'
import { useTranslation } from 'react-i18next'

type Tone = 'green' | 'amber' | 'blue' | 'red' | 'slate'

/** Tint + darker text of the same hue for legibility; the dot carries the exact status colour. */
const TONE_CLASSES: Record<Tone, { pill: string; dot: string }> = {
  green: { pill: 'bg-emerald-50 text-emerald-800 ring-emerald-200', dot: 'bg-status-green' },
  amber: { pill: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-status-amber' },
  blue: { pill: 'bg-blue-50 text-blue-800 ring-blue-200', dot: 'bg-status-blue' },
  red: { pill: 'bg-red-50 text-red-800 ring-red-200', dot: 'bg-status-red' },
  slate: { pill: 'bg-slate-100 text-slate-700 ring-slate-200', dot: 'bg-slate-400' },
}

const RESERVATION_TONES: Record<ReservationStatus, Tone> = {
  PENDING: 'amber',
  CONFIRMED: 'green',
  IN_PROGRESS: 'blue',
  COMPLETED: 'slate',
  CANCELLED: 'red',
  REJECTED: 'red',
}

const EQUIPMENT_TONES: Record<EquipmentStatus, Tone> = {
  AVAILABLE: 'green',
  RENTED: 'blue',
  MAINTENANCE: 'amber',
  INACTIVE: 'slate',
}

const PAYMENT_TONES: Record<ReservationPaymentStatus, Tone> = {
  PAID: 'green',
  UNPAID: 'amber',
  REFUNDED: 'slate',
}

type StatusBadgeProps =
  | { kind: 'reservation'; status: ReservationStatus }
  | { kind: 'equipment'; status: EquipmentStatus }
  | { kind: 'payment'; status: ReservationPaymentStatus }

function toneOf(props: StatusBadgeProps): Tone {
  switch (props.kind) {
    case 'reservation':
      return RESERVATION_TONES[props.status]
    case 'equipment':
      return EQUIPMENT_TONES[props.status]
    case 'payment':
      return PAYMENT_TONES[props.status]
  }
}

export function StatusBadge(props: StatusBadgeProps) {
  const { t } = useTranslation()
  const label =
    props.kind === 'reservation'
      ? t(`status.reservation.${props.status}`)
      : props.kind === 'equipment'
        ? t(`status.equipment.${props.status}`)
        : t(`status.payment.${props.status}`)
  const classes = TONE_CLASSES[toneOf(props)]
  return (
    <span
      className={cn(
        'inline-flex h-6 flex-none items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset',
        classes.pill,
      )}
    >
      <span className={cn('size-1.5 rounded-full', classes.dot)} aria-hidden="true" />
      {label}
    </span>
  )
}
