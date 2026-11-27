import { ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { videoSource } from '../../utils/video'

/**
 * The machine at work: one short clip the owner linked. Embeddable videos and files play as the last slide
 * of the photo gallery; this section is for any other link, shown as a button that opens it.
 */
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
