import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '../../hooks/useMutation'
import { reviewService } from '../../services/reviewService'
import type { Reservation, Review } from '../../types'
import { formatDateRange } from '../../utils/format'
import { Button } from '../common/Button'
import { Modal } from '../common/Modal'
import { Textarea } from '../common/Textarea'
import { StarInput } from './StarRating'

const COMMENT_MAX = 1000

interface ReviewModalProps {
  reservation: Reservation
  onClose: () => void
  onSaved: (review: Review) => void
}

/** The renter rates a machine after a completed reservation: stars (required), its condition and a comment. */
export function ReviewModal({ reservation, onClose, onSaved }: ReviewModalProps) {
  const { t } = useTranslation()
  const [rating, setRating] = useState(0)
  const [conditionRating, setConditionRating] = useState(0)
  const [comment, setComment] = useState('')
  const [showErrors, setShowErrors] = useState(false)

  const save = useMutation(reviewService.create, {
    successMessage: t('reviews.saved'),
    errorTitle: t('reviews.saveFailed'),
    onSuccess: (review) => {
      onSaved(review)
      onClose()
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    if (rating === 0) {
      setShowErrors(true)
      return
    }
    void save.mutate({
      reservationId: reservation.id,
      rating,
      conditionRating: conditionRating || undefined,
      comment: comment.trim() || undefined,
    })
  }

  const formId = `review-form-${reservation.id}`

  return (
    <Modal
      isOpen
      title={t('reviews.modalTitle')}
      onClose={onClose}
      isDismissable={!save.isLoading}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={save.isLoading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form={formId} isLoading={save.isLoading}>
            {t('reviews.submit')}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-5" noValidate>
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-ink">{reservation.equipmentName}</span>
          <span className="num"> · {formatDateRange(reservation.startDate, reservation.endDate)}</span>
        </p>

        <StarInput
          label={t('reviews.ratingLabel')}
          value={rating}
          onChange={setRating}
          error={showErrors && rating === 0 ? t('reviews.ratingRequired') : undefined}
        />

        <StarInput
          label={t('reviews.conditionLabel')}
          value={conditionRating}
          onChange={setConditionRating}
        />

        <Textarea
          label={t('reviews.commentLabel')}
          placeholder={t('reviews.commentPlaceholder')}
          value={comment}
          onChange={(event) => setComment(event.target.value.slice(0, COMMENT_MAX))}
          maxLength={COMMENT_MAX}
          rows={4}
          hint={t('reviews.commentHint', { used: comment.length, max: COMMENT_MAX })}
        />
      </form>
    </Modal>
  )
}