import { useState } from 'react'
import { cn } from '../../utils/cn'

const SIZES = {
  xs: 'size-5 text-[10px]',
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-20 text-2xl',
} as const

/** Two initials from a person's or a company's name: "Constructora Demo SAC" -> "CD". */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const letters = words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? '?').slice(0, 2)
  return letters.toUpperCase()
}

interface AvatarProps {
  name: string
  src?: string | null
  /** People are round, companies square. */
  shape?: 'circle' | 'square'
  size?: keyof typeof SIZES
  /** `dark` for the asphalt sidebar. */
  tone?: 'light' | 'dark'
  className?: string
}

/** The photo or logo when there is one; otherwise the initials, so every account still has a face. */
export function Avatar({ name, src, shape = 'circle', size = 'md', tone = 'light', className }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showImage = Boolean(src) && failedSrc !== src
  const radius = shape === 'circle' ? 'rounded-full' : size === 'lg' ? 'rounded-xl' : 'rounded-md'

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden font-semibold select-none',
        SIZES[size],
        radius,
        showImage ? 'bg-white' : tone === 'dark' ? 'bg-white/10 text-white' : 'bg-accent-tint text-amber-900',
        className,
      )}
      aria-hidden="true"
    >
      {showImage ? (
        <img
          src={src!}
          alt=""
          className={cn('size-full', shape === 'square' ? 'object-contain' : 'object-cover')}
          onError={() => setFailedSrc(src ?? null)}
        />
      ) : (
        initialsOf(name)
      )}
    </span>
  )
}
