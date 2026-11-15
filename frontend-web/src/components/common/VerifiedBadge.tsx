import { BadgeCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'

/** "Verified company": SUNAT reports its RUC as ACTIVO and HABIDO. `compact` is the icon alone, for cards. */
export function VerifiedBadge({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { t } = useTranslation()
  if (compact) {
    return (
      <BadgeCheck
        className={cn('inline size-4 shrink-0 fill-sky-600 text-white', className)}
        aria-label={t('verification.badge')}
        role="img"
      >
        <title>{t('verification.badgeHint')}</title>
      </BadgeCheck>
    )
  }
  return (
    <span
      title={t('verification.badgeHint')}
      className={cn('inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-800', className)}
    >
      <BadgeCheck className="size-4 fill-sky-600 text-white" aria-hidden="true" />
      {t('verification.badge')}
    </span>
  )
}
