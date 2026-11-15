import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'

/** How far the page must scroll before the button appears: about one screen of a phone. */
const SHOW_AFTER_PX = 480

/**
 * Floating "back to top" button, bottom right. Hidden at the top of the page and shown once the user has
 * scrolled down; `raised` lifts it above the assistant button that floats in the same corner.
 */
export function ScrollToTopButton({ raised = false }: { raised?: boolean }) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const update = () => setIsVisible(window.scrollY > SHOW_AFTER_PX)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          aria-label={t('common.scrollTop')}
          title={t('common.scrollTop')}
          className={cn(
            'fixed right-5 z-30 flex size-12 items-center justify-center rounded-full bg-machine text-asphalt shadow-lg ring-2 ring-asphalt/10',
            'hover:bg-machine-hover focus-visible:ring-4 focus-visible:ring-asphalt/40 focus-visible:outline-none',
            raised ? 'bottom-20' : 'bottom-5',
          )}
        >
          <ArrowUp className="size-6" strokeWidth={2.5} aria-hidden="true" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}
