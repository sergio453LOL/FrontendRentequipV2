import { MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'
import { Avatar } from './Avatar'

interface OwnerCardProps {
  name: string
  logoUrl: string | null
  description: string | null
  /** The company's own city; left out on a machine's page, where the city shown is the machine's. */
  city?: string
}

/** How renters see a company next to its machines: the profile previews the same block it edits. */
export function OwnerCard({ name, logoUrl, description, city }: OwnerCardProps) {
  const { t } = useTranslation()
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <Avatar name={name} src={logoUrl} shape="square" size="md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{name}</p>
          {city && (
            <p className="flex items-center gap-1 text-xs text-slate-600">
              <MapPin className="size-3.5" aria-hidden="true" />
              {city}
            </p>
          )}
        </div>
      </div>
      <p className={cn('mt-3 max-w-[68ch] text-sm leading-6 whitespace-pre-line', description?.trim() ? 'text-ink' : 'text-slate-500')}>
        {description?.trim() || t('profile.company.noAbout')}
      </p>
    </div>
  )
}
