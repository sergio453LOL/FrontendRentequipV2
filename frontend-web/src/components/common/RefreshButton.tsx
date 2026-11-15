import { motion, useReducedMotion } from 'framer-motion'
import { RotateCw } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { requestRefresh } from '../../hooks/useRefreshSignal'
import { cn } from '../../utils/cn'

/** Reloads the data of the current page in place: filters, scroll and the open session stay as they are. */
export function RefreshButton({ className }: { className?: string }) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const [turns, setTurns] = useState(0)
  const label = t('refresh.label')

  const refresh = () => {
    setTurns((count) => count + 1)
    requestRefresh()
  }

  return (
    <button
      type="button"
      onClick={refresh}
      aria-label={label}
      title={label}
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition-colors duration-200 hover:border-slate-300 hover:text-ink',
        className,
      )}
    >
      <motion.span
        aria-hidden="true"
        className="flex"
        animate={{ rotate: reduceMotion ? 0 : turns * 360 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <RotateCw className="size-4" />
      </motion.span>
    </button>
  )
}
