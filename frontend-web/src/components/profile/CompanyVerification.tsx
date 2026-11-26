import { ShieldQuestion } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '../../hooks/useMutation'
import { api } from '../../services/api'
import type { Company } from '../../types'
import { Button } from '../common/Button'
import { VerifiedBadge } from '../common/VerifiedBadge'

/**
 * The company's standing: the verified badge, or a button to check the RUC with SUNAT now. A good standing
 * alone does not give the badge: the company then waits for a RentEquip admin to confirm it is who it says.
 * Only a company administrator can ask for the check.
 */
export function CompanyVerification({ company, canEdit, onVerified }: { company: Company; canEdit: boolean; onVerified: () => void }) {
  const { t } = useTranslation()
  const inReview = !company.verified && company.taxStatus === 'ACTIVO / HABIDO'
  const verify = useMutation(async () => (await api.post<Company>('/companies/me/verification')).data, {
    successMessage: t('verification.verifyOk'),
    errorTitle: t('verification.verifyFailed'),
    onSuccess: onVerified,
  })

  return (
    <div className="space-y-2 rounded-lg bg-raised p-4 text-sm">
      {company.verified ? (
        <>
          <VerifiedBadge />
          <p className="text-slate-700">{t('verification.verifiedText', { ruc: company.taxId, status: company.taxStatus ?? 'ACTIVO / HABIDO' })}</p>
        </>
      ) : (
        <>
          <p className="flex items-center gap-1.5 font-semibold text-ink">
            <ShieldQuestion className="size-4 text-slate-500" aria-hidden="true" />
            {t(inReview ? 'verification.inReview' : 'verification.notVerified')}
          </p>
          <p className="text-slate-700">
            {inReview
              ? t('verification.inReviewText', { status: company.taxStatus })
              : company.taxStatus
                ? t('verification.lastStatus', { status: company.taxStatus })
                : t('verification.notVerifiedText')}
          </p>
          {canEdit && !inReview && (
            <Button size="sm" variant="secondary" isLoading={verify.isLoading} onClick={() => void verify.mutate()}>
              {t('verification.verifyButton')}
            </Button>
          )}
        </>
      )}
    </div>
  )
}
