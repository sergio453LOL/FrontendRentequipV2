import { Truck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'

interface EquipmentImageProps {
  src: string | null | undefined
  alt: string
  className?: string
}

/** Equipment photo that falls back to a placeholder when there is no URL or the image fails to load. */
export function EquipmentImage({ src, alt, className }: EquipmentImageProps) {
  const { t } = useTranslation()
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const hasImage = Boolean(src) && failedSrc !== src

  if (!hasImage) {
    return (
      <div
        role="img"
        aria-label={t('gallery.noPhoto', { name: alt })}
        className={cn('flex items-center justify-center bg-raised text-slate-400', className)}
      >
        <Truck className="size-1/4 max-h-16 max-w-16" aria-hidden="true" />
      </div>
    )
  }

  return (
    <img
      src={src ?? undefined}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailedSrc(src ?? null)}
      className={cn('object-cover', className)}
    />
  )
}
