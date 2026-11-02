import { ArrowLeft, Construction } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { PATHS } from '../routes/paths'

export default function NotFoundPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <span className="flex size-20 items-center justify-center rounded-full bg-active text-accent-ink">
        <Construction className="size-10" aria-hidden="true" />
      </span>
      <div className="space-y-2">
        <p className="text-sm font-semibold tracking-widest text-accent-ink uppercase">{t('errors.notFoundCode')}</p>
        <h1 className="text-3xl font-semibold text-slate-900">{t('errors.notFoundTitle')}</h1>
        <p className="max-w-md text-slate-600">
          {t('errors.notFoundText')}
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => navigate(-1)} leftIcon={<ArrowLeft className="size-4" />}>
          {t('common.back')}
        </Button>
        <Button onClick={() => navigate(PATHS.home)}>{t('errors.goHome')}</Button>
      </div>
    </main>
  )
}
