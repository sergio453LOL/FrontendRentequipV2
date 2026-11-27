import { FlaskConical } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useFetch } from '../../hooks/useFetch'
import { PATHS } from '../../routes/paths'
import { ENDPOINTS } from '../../services/endpoints'
import type { User } from '../../types'

/**
 * Thin strip above the app while signed in as the shared demo account: everybody trying RentEquip uses the
 * same company, so it says so, gives the test card for the payment step and offers an account of their own.
 */
export function DemoBanner() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const me = useFetch<User>(user ? ENDPOINTS.me : null)
  if (!me.data?.demoAccount) return null

  return (
    <div role="status" className="theme-light flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 bg-machine px-4 py-1.5 text-center text-[13px] text-asphalt">
      <FlaskConical className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
      <span>
        <strong className="font-semibold">{t('demo.bannerTitle')}</strong> {t('demo.bannerText')}{' '}
        <span className="num font-semibold whitespace-nowrap">4242 4242 4242 4242</span>
      </span>
      <Link to={PATHS.register} className="font-semibold underline underline-offset-2 hover:no-underline">
        {t('demo.bannerCta')}
      </Link>
    </div>
  )
}
