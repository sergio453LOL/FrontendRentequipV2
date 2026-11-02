import { WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'

export function OfflineBanner() {
  const isOnline = useOnlineStatus()
  const { t } = useTranslation()
  if (isOnline) return null

  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-slate-900 px-4 py-2 text-sm text-white">
      <WifiOff className="size-4 text-white" aria-hidden="true" />
      {t('errors.offline')}
    </div>
  )
}
