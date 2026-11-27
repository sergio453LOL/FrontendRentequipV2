import { ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'
import { photoCredit } from '../../utils/photoCredits'
import { videoSource } from '../../utils/video'
import { EquipmentImage } from './EquipmentImage'

interface ImageGalleryProps {
  images: string[]
  alt: string
  /** The owner's video: it plays as the last slide when it can be embedded (YouTube, Vimeo or a file). */
  videoUrl?: string | null
}

/**
 * Rounded corners that also clip an embedded player: a plain overflow-hidden radius does not cut an iframe
 * in every browser, a clip-path with the same radius does.
 */
const ROUNDED_STAGE = 'overflow-hidden rounded-xl [clip-path:inset(0_round_0.75rem)]'
const ROUNDED_THUMB = 'overflow-hidden rounded-lg [clip-path:inset(0_round_0.5rem)]'

export function ImageGallery({ images, alt, videoUrl }: ImageGalleryProps) {
  const { t } = useTranslation()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const video = videoUrl ? videoSource(videoUrl) : null
  const playableVideo = video && video.kind !== 'link' ? video : null
  const slideCount = images.length + (playableVideo ? 1 : 0)
  const hasMany = slideCount > 1
  const isVideo = playableVideo !== null && selectedIndex === images.length
  const current = isVideo ? null : (images[selectedIndex] ?? null)
  const credit = isVideo ? null : photoCredit(current)

  function showRelative(offset: number) {
    setSelectedIndex((index) => (index + offset + slideCount) % slideCount)
  }

  return (
    <div className="space-y-3">
      <div className={cn('relative bg-raised', ROUNDED_STAGE)}>
        {isVideo && playableVideo ? (
          <div className="flex aspect-[4/3] w-full items-center bg-asphalt">
            {playableVideo.kind === 'embed' ? (
              // Mounted only while it is the slide on screen, so it loads when asked for and stops when left.
              <iframe
                src={playableVideo.src}
                title={t('equipment.videoOf', { name: alt })}
                className="aspect-video w-full"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <video src={playableVideo.src} controls preload="metadata" className="aspect-video w-full" aria-label={t('equipment.videoOf', { name: alt })} />
            )}
          </div>
        ) : (
          <EquipmentImage src={current} alt={t('gallery.photoN', { name: alt, n: selectedIndex + 1 })} className="aspect-[4/3] w-full" />
        )}
        {hasMany && (
          <>
            <GalleryArrow side="left" onClick={() => showRelative(-1)} />
            <GalleryArrow side="right" onClick={() => showRelative(1)} />
            {/* On the video the counter moves up, out of the player's controls. */}
            <span className={cn('absolute right-3 rounded-full bg-slate-900/70 px-2.5 py-1 text-xs text-white', isVideo ? 'top-3' : 'bottom-3')}>
              {isVideo ? t('gallery.video') : `${selectedIndex + 1} / ${images.length}`}
            </span>
          </>
        )}
      </div>
      {credit && <p className="text-xs text-slate-500">{credit}</p>}

      {hasMany && (
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5" aria-label={t('gallery.thumbnails')}>
          {images.map((image, index) => (
            <li key={image}>
              <button
                type="button"
                onClick={() => setSelectedIndex(index)}
                aria-label={t('gallery.showPhoto', { n: index + 1 })}
                aria-pressed={index === selectedIndex}
                className={cn(
                  'w-full ring-2 transition',
                  ROUNDED_THUMB,
                  index === selectedIndex ? 'ring-slate-300' : 'ring-transparent opacity-70 hover:opacity-100',
                )}
              >
                <EquipmentImage src={image} alt="" className="aspect-square w-full" />
              </button>
            </li>
          ))}
          {playableVideo && (
            <li>
              <button
                type="button"
                onClick={() => setSelectedIndex(images.length)}
                aria-label={t('gallery.showVideo')}
                aria-pressed={isVideo}
                className={cn(
                  'group relative block aspect-square w-full bg-asphalt ring-2 transition',
                  ROUNDED_THUMB,
                  isVideo ? 'ring-slate-300' : 'ring-transparent opacity-80 hover:opacity-100',
                )}
              >
                {playableVideo.thumbnail && <img src={playableVideo.thumbnail} alt="" loading="lazy" className="size-full object-cover" />}
                {/* A dark scrim so the play button reads on any frame. */}
                <span className="absolute inset-0 bg-slate-950/35 transition-colors group-hover:bg-slate-950/20" aria-hidden="true" />
                <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                  <span className="flex size-10 items-center justify-center rounded-full bg-machine text-asphalt shadow-lg transition-transform group-hover:scale-110">
                    <Play className="ml-0.5 size-5 fill-current" />
                  </span>
                </span>
                <span className="absolute bottom-1.5 left-1.5 rounded bg-slate-950/70 px-1.5 py-0.5 text-[11px] font-semibold text-white" aria-hidden="true">
                  {t('gallery.video')}
                </span>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

function GalleryArrow({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const { t } = useTranslation()
  const Icon = side === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? t('gallery.previous') : t('gallery.next')}
      className={cn(
        'absolute top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-machine text-asphalt shadow-lg ring-2 ring-asphalt/15 transition',
        'hover:scale-105 hover:bg-machine-hover focus-visible:ring-4 focus-visible:ring-asphalt/40 focus-visible:outline-none active:scale-95',
        side === 'left' ? 'left-3' : 'right-3',
      )}
    >
      <Icon className="size-7" strokeWidth={2.5} />
    </button>
  )
}
