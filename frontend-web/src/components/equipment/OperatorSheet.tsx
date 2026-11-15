import { BadgeCheck, HardHat } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { OperatorProfile } from '../../types'

/** Who runs the machine when the rate includes an operator: name, licence, experience, certifications. */
export function OperatorSheet({ operator }: { operator: OperatorProfile }) {
  const { t } = useTranslation()
  const certifications = operator.certifications?.split('\n').map((line) => line.trim()).filter(Boolean) ?? []

  return (
    <section aria-labelledby="operator-title" className="space-y-3">
      <h2 id="operator-title" className="text-lg font-bold text-ink">
        {t('equipment.operatorTitle')}
      </h2>
      <div className="grid gap-5 rounded-lg bg-raised p-5 sm:grid-cols-[auto_1fr]">
        <span className="flex size-14 items-center justify-center rounded-full bg-machine text-asphalt" aria-hidden="true">
          <HardHat className="size-7" />
        </span>
        <div className="space-y-4">
          <div>
            <p className="text-base font-semibold text-ink">{operator.name}</p>
            <p className="text-sm text-slate-600">{t('equipment.operatorIncludedNote')}</p>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-slate-600">{t('equipment.operatorLicense')}</dt>
              <dd className="font-medium text-ink">{operator.license ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-600">{t('equipment.operatorExperience')}</dt>
              <dd className="font-medium text-ink">
                {operator.experienceYears !== null ? t('equipment.operatorYears', { count: operator.experienceYears }) : '—'}
              </dd>
            </div>
          </dl>
          {certifications.length > 0 && (
            <div>
              <p className="text-xs text-slate-600">{t('equipment.operatorCertifications')}</p>
              <ul className="mt-1.5 space-y-1 text-sm text-ink">
                {certifications.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <BadgeCheck className="mt-0.5 size-4 shrink-0 text-positive" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
