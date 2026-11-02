import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '../../utils/cn'

const HOLD_MS = 2600
const WIDTH_SPRING = { type: 'spring', stiffness: 220, damping: 28, mass: 0.9 } as const

/**
 * Cycles through words, typing each one in letter by letter. The slot measures the next word and springs to
 * its width, so the whole headline contracts or stretches around it instead of leaving a gap.
 */
export function TypedWord({ words, className }: { words: string[]; className?: string }) {
  const [index, setIndex] = useState(0)
  const [width, setWidth] = useState<number | null>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (reduceMotion || words.length < 2) return
    const timer = setInterval(() => setIndex((current) => (current + 1) % words.length), HOLD_MS)
    return () => clearInterval(timer)
  }, [reduceMotion, words.length])

  const word = words[index] ?? ''

  // Measured before paint, and again when the web font arrives or the heading changes size.
  useLayoutEffect(() => {
    const node = measureRef.current
    if (!node) return
    const update = () => setWidth(node.getBoundingClientRect().width)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [word])

  return (
    <motion.span
      initial={false}
      animate={width === null ? undefined : { width }}
      transition={reduceMotion ? { duration: 0 } : WIDTH_SPRING}
      // Clipping is what makes the old word look squeezed as the slot contracts; the vertical padding keeps
      // descenders visible without changing the line height.
      className={cn('relative -my-[0.12em] inline-block overflow-hidden py-[0.12em] align-bottom whitespace-nowrap', className)}
    >
      <span ref={measureRef} className="invisible absolute top-0 left-0 whitespace-nowrap" aria-hidden="true">
        {word}
      </span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={word}
          className="inline-block"
          aria-live="polite"
          exit={{ opacity: 0, y: -10, filter: 'blur(4px)', transition: { duration: 0.22 } }}
        >
          {word.split('').map((letter, letterIndex) => (
            <motion.span
              key={letterIndex}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + letterIndex * 0.035, duration: 0.25, ease: 'easeOut' }}
              className="inline-block"
            >
              {letter}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  )
}
