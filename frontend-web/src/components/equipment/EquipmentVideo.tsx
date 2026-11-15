import { ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type VideoSource = { kind: 'embed'; src: string } | { kind: 'file'; src: string } | { kind: 'link'; src: string }

/** YouTube and Vimeo play embedded (YouTube without tracking cookies); a direct file plays in the page. */
export function videoSource(url: string): VideoSource {
  const youtube = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/)
  if (youtube) return { kind: 'embed', src: `https://www.youtube-nocookie.com/embed/${youtube[1]}?rel=0` }
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeo) return { kind: 'embed', src: `https://player.vimeo.com/video/${vimeo[1]}` }
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) return { kind: 'file', src: url }
  return { kind: 'link', src: url }
}

/** The machine at work: one short clip the owner linked. */
export function EquipmentVideo({ url, title }: { url: string; title: string }) {
  const { t } = useTranslation()
  const source = videoSource(url)

  return (
    <section aria-labelledby="video-title" className="space-y-3">
      <h2 id="video-title" className="text-lg font-bold text-ink">
        {t('equipment.videoTitle')}
      </h2>
      {source.kind === 'link' ? (
        <a
          href={source.src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-raised px-4 py-3 text-sm font-semibold text-ink hover:bg-slate-100"
        >
          <ExternalLink className="size-4" aria-hidden="true" />
          {t('equipment.videoOpen')}
        </a>
      ) : (
        <div className="aspect-video overflow-hidden rounded-lg bg-asphalt">
          {source.kind === 'embed' ? (
            <iframe
              src={source.src}
              title={t('equipment.videoOf', { name: title })}
              className="size-full"
              loading="lazy"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <video src={source.src} controls preload="metadata" className="size-full" aria-label={t('equipment.videoOf', { name: title })} />
          )}
        </div>
      )}
    </section>
  )
}
