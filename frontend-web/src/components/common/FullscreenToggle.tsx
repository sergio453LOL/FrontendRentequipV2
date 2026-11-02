import { Maximize, Minimize } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'

function subscribe(onChange: () => void) {
  document.addEventListener('fullscreenchange', onChange)
  return () => document.removeEventListener('fullscreenchange', onChange)
}

const isFullscreen = () => document.fullscreenElement !== null

/** Enters or leaves browser fullscreen. Hidden where the browser does not allow it (Safari on iPhone). */
export function FullscreenToggle({ className }: { className?: string }) {
  const { t } = useTranslation()
  const active = useSyncExternalStore(subscribe, isFullscreen, () => false)

  if (!document.fullscreenEnabled) return null

  const label = active ? t('fullscreen.exit') : t('fullscreen.enter')
  const toggle = () => {
    // Rejected when the browser blocks it (e.g. inside an iframe); the button simply stays as it was.
    const request = active ? document.exitFullscreen() : document.documentElement.requestFullscreen()
    request.catch(() => undefined)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition-colors duration-200 hover:border-slate-300 hover:text-ink',
        className,
      )}
    >
      {active ? <Minimize className="size-4" aria-hidden="true" /> : <Maximize className="size-4" aria-hidden="true" />}
    </button>
  )
}
