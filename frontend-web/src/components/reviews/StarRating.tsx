import { Star } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'

const STARS = [1, 2, 3, 4, 5] as const

/** The word for each score, from one star to five (i18n `reviews.scale`). */
const SCALE = ['veryPoor', 'poor', 'fair', 'good', 'excellent'] as const

const SIZES = {
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-7',
} as const

/** A score from 0 to 5 drawn as five stars; a half star shows from .25 up so 4.3 reads as more than 4. */
export function StarDisplay({
  value,
  size = 'md',
  className,
}: {
  value: number
  size?: keyof typeof SIZES
  className?: string
}) {
  const { t } = useTranslation()

  return (
    <span
      role="img"
      aria-label={t('reviews.outOfFive', { value: value.toFixed(1) })}
      className={cn('inline-flex items-center gap-0.5', className)}
    >
      {STARS.map((star) => {
        const fill = Math.max(0, Math.min(1, value - star + 1))
        const shown = fill >= 0.75 ? 1 : fill >= 0.25 ? 0.5 : 0

        return (
          <span key={star} className={cn('relative inline-block', SIZES[size])} aria-hidden="true">
            <Star className={cn('absolute inset-0 text-slate-300', SIZES[size])} />
            {shown > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${shown * 100}%` }}>
                <Star className={cn('fill-brand text-brand', SIZES[size])} />
              </span>
            )}
          </span>
        )
      })}
    </span>
  )
}

interface StarInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  error?: string
}

/**
 * Picks a score from 1 to 5. It is a radio group: arrows move the choice, and hovering previews the stars
 * a click would set, with the word for that score beside them.
 */
export function StarInput({ label, value, onChange, error }: StarInputProps) {
  const { t } = useTranslation()
  const [hovered, setHovered] = useState(0)
  const shown = hovered || value

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      onChange(Math.min(5, (value || 0) + 1))
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      onChange(Math.max(1, (value || 2) - 1))
    }
  }

  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-medium text-slate-700">{label}</legend>
      <div className="flex items-center gap-3">
        <div
          role="radiogroup"
          aria-label={label}
          className="flex items-center gap-1"
          onMouseLeave={() => setHovered(0)}
          onKeyDown={handleKeyDown}
        >
          {STARS.map((star) => {
            const isChecked = value === star

            return (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={isChecked}
                aria-label={t(`reviews.scale.${SCALE[star - 1]}`)}
                // Only the chosen star (or the first, when none is) is in the tab order, as in any radio group.
                tabIndex={isChecked || (value === 0 && star === 1) ? 0 : -1}
                onClick={() => onChange(star)}
                onMouseEnter={() => setHovered(star)}
                className="rounded-md p-0.5 transition-transform duration-150 hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink active:scale-95"
              >
                <Star
                  className={cn(
                    'size-8 transition-colors',
                    star <= shown ? 'fill-brand text-brand' : 'text-slate-300',
                  )}
                  aria-hidden="true"
                />
              </button>
            )
          })}
        </div>
        <span className="min-w-24 text-sm font-medium text-slate-700" aria-hidden="true">
          {shown > 0 ? t(`reviews.scale.${SCALE[shown - 1]}`) : ''}
        </span>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </fieldset>
  )
}