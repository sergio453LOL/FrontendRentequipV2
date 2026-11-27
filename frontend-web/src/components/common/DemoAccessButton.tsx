import { ArrowRight, PlayCircle } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { PATHS } from '../../routes/paths'
import { ApiError } from '../../utils/apiError'
import { cn } from '../../utils/cn'
import { storeMode } from '../../utils/workspaceMode'
import { Spinner } from './Spinner'

interface DemoAccessButtonProps {
  /** Where to land after entering; the catalogue by default. */
  returnTo?: string
  /** `solid`: the yellow action. `link`: an inline text action for a line of copy. */
  variant?: 'solid' | 'link'
  /** Shorter label for tight spots such as the header on a phone. */
  short?: boolean
  className?: string
}

/**
 * "Probar la demo": one click enters as the shared demo renter, without registering a company, so the jury
 * and the public can use the product right away. The server keeps that account from changing its own
 * settings, so no visitor can lock the next one out.
 */
export function DemoAccessButton({ returnTo = PATHS.catalog, variant = 'solid', short = false, className }: DemoAccessButtonProps) {
  const { t } = useTranslation()
  const { loginAsDemo } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [isLoading, setIsLoading] = useState(false)

  async function enter() {
    if (isLoading) return
    setIsLoading(true)
    try {
      // The demo account rents machines in: the panel opens on the renter side.
      storeMode('renter')
      await loginAsDemo()
      navigate(returnTo, { replace: true })
    } catch (caught) {
      toast.error(t('demo.failed'), ApiError.from(caught).message)
      setIsLoading(false)
    }
  }

  if (variant === 'link') {
    return (
      <button
        type="button"
        onClick={() => void enter()}
        disabled={isLoading}
        className={cn(
          'inline-flex items-center gap-1.5 font-semibold text-ink underline decoration-machine decoration-2 underline-offset-4 transition-colors hover:decoration-ink disabled:opacity-60',
          className,
        )}
      >
        {isLoading ? <Spinner size="sm" /> : null}
        {t('demo.cta')}
        <ArrowRight className="size-4" aria-hidden="true" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => void enter()}
      disabled={isLoading}
      aria-busy={isLoading}
      className={cn(
        'inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-machine px-5 text-[15px] font-semibold whitespace-nowrap text-asphalt transition-[background-color,transform] hover:bg-machine-hover active:scale-[0.98] disabled:opacity-70',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-asphalt',
        className,
      )}
    >
      {isLoading ? <Spinner size="sm" /> : <PlayCircle className="size-[18px]" aria-hidden="true" />}
      {short ? t('demo.ctaShort') : t('demo.cta')}
    </button>
  )
}
