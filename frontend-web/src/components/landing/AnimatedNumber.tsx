import { animate, useInView, useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'

interface AnimatedNumberProps {
  value: number
  format: (value: number) => string
  duration?: number
  /** Seconds to wait before counting, so a row of tiles can count one after another. */
  delay?: number
}

/** Counts up from zero to the real value the first time it scrolls into view. */
export function AnimatedNumber({ value, format, duration = 2.2, delay = 0 }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  const reduceMotion = useReducedMotion()
  // Callers pass inline formatters: keep the latest one without restarting the count on every render.
  const formatRef = useRef(format)
  useEffect(() => {
    formatRef.current = format
  })

  useEffect(() => {
    const node = ref.current
    if (!node || !isInView) return
    if (reduceMotion) {
      node.textContent = formatRef.current(value)
      return
    }
    const controls = animate(0, value, {
      duration,
      delay,
      // Gentle ease-out: the digits visibly climb and only slow down near the end.
      ease: [0.33, 1, 0.68, 1],
      onUpdate: (latest) => {
        node.textContent = formatRef.current(latest)
      },
    })
    return () => controls.stop()
  }, [delay, duration, isInView, reduceMotion, value])

  return (
    <span ref={ref} className="num">
      {format(0)}
    </span>
  )
}
