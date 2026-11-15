import { ArrowRight, HardHat, Sparkles, Tag, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { buildPath } from '../../routes/paths'
import type { EquipmentStatus, EquipmentSummary } from '../../types'
import { cn } from '../../utils/cn'
import { formatCurrency } from '../../utils/format'
import { EquipmentImage } from './EquipmentImage'

interface EquipmentCardProps {
  equipment: EquipmentSummary
  /** The assistant recommended it in this session. */
  suggestedByAi?: boolean
  /** Free today: no pending or active reservation covers today's date. */
  availableToday?: boolean
}

const STATUS_DOT: Record<EquipmentStatus, string> = {
  AVAILABLE: 'bg-status-green',
  RENTED: 'bg-status-blue',
  MAINTENANCE: 'bg-status-amber',
  INACTIVE: 'bg-slate-400',
  SOLD: 'bg-slate-400',
}

/** The machine's state on its photo: a frosted chip whose dot pulses while it can be booked. */
function StatusChip({ status }: { status: EquipmentStatus }) {
  const { t } = useTranslation()
  const isLive = status === 'AVAILABLE'
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-900 shadow-sm backdrop-blur-md">
      <span className="relative flex size-2" aria-hidden="true">
        {isLive && <span className={cn('absolute inset-0 animate-ping rounded-full opacity-60 motion-reduce:hidden', STATUS_DOT[status])} />}
        <span className={cn('relative size-2 rounded-full', STATUS_DOT[status])} />
      </span>
      {t(`status.equipment.${status}`)}
    </span>
  )
}

/** A small technical fact about the rental, set under the photo rather than over it. */
const SPEC_TONES = {
  now: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  operator: 'bg-amber-50 text-amber-800 ring-amber-200',
  sale: 'bg-slate-100 text-slate-800 ring-slate-300',
} as const

function Spec({ icon, children, tone }: { icon: ReactNode; children: ReactNode; tone: keyof typeof SPEC_TONES }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset',
        SPEC_TONES[tone],
      )}
    >
      {icon}
      {children}
    </span>
  )
}

/** A machine in the catalogue: its photo first, then what it is, where it is and what it costs a day. */
export function EquipmentCard({ equipment, suggestedByAi = false, availableToday = false }: EquipmentCardProps) {
  const { t } = useTranslation()
  const forSale = equipment.salePrice !== null && equipment.status !== 'SOLD'
  const hasSpecs = availableToday || equipment.operatorIncluded || forSale
  return (
    <Link
      to={buildPath.equipmentDetail(equipment.id)}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition-all duration-200 hover:-translate-y-1 hover:border-amber-400/60 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink motion-reduce:hover:translate-y-0"
    >
      <div className="relative overflow-hidden bg-raised">
        <EquipmentImage
          src={equipment.primaryImageUrl}
          alt={equipment.name}
          className="aspect-[16/10] w-full transition-transform duration-300 ease-out group-hover:scale-105"
        />
        <span className="absolute top-3 left-3">
          <StatusChip status={equipment.status} />
        </span>
        {suggestedByAi && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-[#0f172a]/90 px-2.5 py-1 text-xs font-semibold text-[#f8fafc] backdrop-blur-md">
            <Sparkles className="size-3.5 text-brand" aria-hidden="true" />
            {t('tags.ai')}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-4 pt-3.5 pb-4">
        {hasSpecs && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {availableToday && (
              <Spec tone="now" icon={<Zap className="size-3" aria-hidden="true" />}>
                {t('tags.immediate')}
              </Spec>
            )}
            {equipment.operatorIncluded && (
              <Spec tone="operator" icon={<HardHat className="size-3" aria-hidden="true" />}>
                {t('tags.operator')}
              </Spec>
            )}
            {forSale && (
              <Spec tone="sale" icon={<Tag className="size-3" aria-hidden="true" />}>
                {t('tags.forSale')}
              </Spec>
            )}
          </div>
        )}
        <h3 className="line-clamp-1 text-[15px] leading-5 font-semibold text-slate-900" title={equipment.name}>
          {equipment.name}
        </h3>
        <p className="mt-1 truncate text-xs text-slate-500">
          {equipment.city} · {equipment.ownerCompanyName}
        </p>

        <div className="mt-auto pt-3.5" />
        <div className="flex items-end justify-between gap-2 border-t border-slate-100 pt-3">
          <p className="num">
            <span className="text-lg font-bold text-slate-950 tabular-nums">{formatCurrency(equipment.dailyRate, equipment.currency)}</span>
            <span className="text-xs text-slate-500"> {t('common.perDay')}</span>
          </p>
          <span className="mb-0.5 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 transition-colors duration-200 group-hover:text-action-ink">
            {t('catalog.quote')}
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  )
}
