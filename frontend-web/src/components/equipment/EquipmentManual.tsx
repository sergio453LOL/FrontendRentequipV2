import { ExternalLink, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** The owner's instructions PDF: what is inside, and a link that opens it in a new tab. */
export function EquipmentManual({ url, equipmentName }: { url: string; equipmentName: string }) {
  const { t } = useTranslation()
  return (
    <section aria-labelledby="manual-title" className="space-y-3">
      <h2 id="manual-title" className="text-lg font-bold text-ink">
        {t('equipment.manual.title')}
      </h2>
      <div className="flex flex-col gap-4 rounded-lg bg-raised p-5 sm:flex-row sm:items-center">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-white text-red-700 ring-1 ring-slate-200/80">
          <FileText className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{t('equipment.manual.file', { name: equipmentName })}</p>
          <p className="mt-0.5 text-sm leading-6 text-slate-600">{t('equipment.manual.text')}</p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-sheet transition-colors hover:bg-ink-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {t('equipment.manual.open')}
          <ExternalLink className="size-4" aria-hidden="true" />
          <span className="sr-only">{t('equipment.manual.newTab')}</span>
        </a>
      </div>
    </section>
  )
}
