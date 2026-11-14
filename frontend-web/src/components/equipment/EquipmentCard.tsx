import { HardHat, Sparkles, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { buildPath } from '../../routes/paths'
import type { EquipmentSummary } from '../../types'
import { formatCurrency } from '../../utils/format'
import { StatusBadge } from '../common/StatusBadge'
import { EquipmentImage } from './EquipmentImage'

interface EquipmentCardProps {
  equipment: EquipmentSummary
  /** The assistant recommended it in this session. */
  suggestedByAi?: boolean
  /** Free today: no pending or active reservation covers today's date. */
  availableToday?: boolean
}

function Tag({ icon, children, tone }: { icon: ReactNode; children: ReactNode; tone: 'ai' | 'now' | 'operator' }) {
  const tones = {
    ai: 'bg-[#0f172a] text-[#f8fafc]',
    now: 'bg-[#059669] text-[#f8fafc]',
    operator: 'bg-brand text-[#0f172a]',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {icon}
      {children}
    </span>
  )
}

/** A machine in the catalogue: its photo first, then what it is, where it is and what it costs a day. */
export function EquipmentCard({ equipment, suggestedByAi = false, availableToday = false }: EquipmentCardProps) {
  const { t } = useTranslation()
  const hasTags = suggestedByAi || availableToday || equipment.operatorIncluded
  return (
    <Link
      to={buildPath.equipmentDetail(equipment.id)}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <div className="relative overflow-hidden bg-raised">
        <EquipmentImage
          src={equipment.primaryImageUrl}
          alt={equipment.name}
          className="aspect-[4/3] w-full transition-transform duration-500 ease-out group-hover:scale-110"
        />
        <span className="absolute top-3 left-3">
          <StatusBadge kind="equipment" status={equipment.status} />
        </span>
        {hasTags && (
          <span className="absolute right-3 bottom-3 left-3 flex flex-wrap gap-1.5">
            {suggestedByAi && (
              <Tag tone="ai" icon={<Sparkles className="size-3.5 text-brand" aria-hidden="true" />}>
                {t('tags.ai')}
              </Tag>
            )}
            {availableToday && (
              <Tag tone="now" icon={<Zap className="size-3.5" aria-hidden="true" />}>
                {t('tags.immediate')}
              </Tag>
            )}
            {equipment.operatorIncluded && (
              <Tag tone="operator" icon={<HardHat className="size-3.5" aria-hidden="true" />}>
                {t('tags.operator')}
              </Tag>
            )}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 px-4 pt-3 pb-4">
        <h3 className="line-clamp-2 text-[15px] leading-5 font-semibold text-ink transition-colors group-hover:text-accent-ink">{equipment.name}</h3>
        <p className="truncate text-[13px] text-slate-500">
          {equipment.city} · {equipment.ownerCompanyName}
        </p>
        <p className="num mt-auto pt-2 text-lg font-bold text-ink">
          {formatCurrency(equipment.dailyRate, equipment.currency)}
          <span className="text-[13px] font-normal text-slate-500"> {t('common.perDay')}</span>
        </p>
      </div>
    </Link>
  )
}
