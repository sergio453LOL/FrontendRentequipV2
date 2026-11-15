import { MessageSquareText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { reviewService } from '../../services/reviewService'
import type { EquipmentRating, Review } from '../../types'
import { formatDate, formatNumber } from '../../utils/format'
import { Button } from '../common/Button'
import { StarDisplay } from './StarRating'

const PAGE_SIZE = 5

/** Initials of the reviewing company, for its avatar: "Constructora Demo SAC" gives "CD". */
function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((word) => word.length > 2 || /^[A-Z]/.test(word))
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('')
}

function ReviewItem({ review }: { review: Review }) {
  const { t } = useTranslation()

  return (
    <li className="flex gap-3 py-4">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600"
        aria-hidden="true"
      >
        {initials(review.reviewerCompanyName) || '·'}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <p className="text-sm font-semibold text-ink">{review.reviewerCompanyName}</p>
          <time dateTime={review.createdAt} className="text-xs text-slate-500">
            {formatDate(review.createdAt.slice(0, 10))}
          </time>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <StarDisplay value={review.rating} size="sm" />
          {review.conditionRating !== null && (
            <span className="text-xs text-slate-500">
              {t('reviews.conditionShort', { value: review.conditionRating })}
            </span>
          )}
        </div>
        {review.comment ? (
          <p className="max-w-[68ch] pt-1 text-[15px] leading-6 whitespace-pre-line text-ink">
            {review.comment}
          </p>
        ) : (
          <p className="pt-1 text-sm text-slate-500">{t('reviews.noComment')}</p>
        )}
      </div>
    </li>
  )
}

/**
 * What renters said about a machine: the average and how many reviews, then the reviews themselves,
 * newest first, five at a time. Only renters of a completed reservation can write one.
 */
export function EquipmentReviews({
  equipmentId,
  rating,
}: {
  equipmentId: number
  rating: EquipmentRating | null
}) {
  const { t } = useTranslation()
  const [reviews, setReviews] = useState<Review[]>([])
  const [page, setPage] = useState(0)
  const [isLast, setIsLast] = useState(true)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let isCurrent = true
    setStatus('loading')

    reviewService
      .listForEquipment(equipmentId, page, PAGE_SIZE)
      .then((data) => {
        if (!isCurrent) return
        setReviews((previous) => (page === 0 ? data.content : [...previous, ...data.content]))
        setIsLast(data.last)
        setStatus('ready')
      })
      .catch(() => isCurrent && setStatus('error'))

    return () => {
      isCurrent = false
    }
  }, [equipmentId, page])

  const count = rating?.reviewCount ?? reviews.length
  const average = rating?.averageRating ?? 0

  return (
    <section aria-labelledby="reviews-title" className="space-y-3">
      <h2 id="reviews-title" className="text-lg font-bold text-ink">
        {t('reviews.title')}
      </h2>

      {count > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-raised px-5 py-4">
          <p className="num text-4xl leading-none font-bold text-ink">{average.toFixed(1)}</p>
          <div className="space-y-1">
            <StarDisplay value={average} size="md" />
            <p className="text-sm text-slate-600">
              {t('reviews.count', { count, formatted: formatNumber(count) })}
            </p>
          </div>
        </div>
      )}

      {status === 'error' && reviews.length === 0 && (
        <p className="text-sm text-slate-600">{t('reviews.loadError')}</p>
      )}

      {status !== 'error' && count === 0 && reviews.length === 0 && status === 'ready' && (
        <div className="flex items-start gap-3 rounded-lg bg-raised px-5 py-4">
          <MessageSquareText className="mt-0.5 size-5 shrink-0 text-slate-400" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-ink">{t('reviews.emptyTitle')}</p>
            <p className="text-sm text-slate-600">{t('reviews.emptyText')}</p>
          </div>
        </div>
      )}

      {reviews.length > 0 && (
        <ul className="divide-y divide-slate-100" aria-busy={status === 'loading'}>
          {reviews.map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))}
        </ul>
      )}

      {!isLast && (
        <Button
          variant="secondary"
          size="sm"
          isLoading={status === 'loading'}
          onClick={() => setPage((current) => current + 1)}
        >
          {t('reviews.showMore')}
        </Button>
      )}
    </section>
  )
}