import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'

type SpinnerSize = 'sm' | 'md' | 'lg'

interface SpinnerProps {
  size?: SpinnerSize
  label?: string
  className?: string
}

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  sm: 'size-4 border-2',
  md: 'size-8 border-[3px]',
  lg: 'size-12 border-4',
}

export function Spinner({ size = 'md', label, className }: SpinnerProps) {
  const { t } = useTranslation()
  return (
    <span role="status" className={cn('inline-flex items-center justify-center', className)}>
      <span
        aria-hidden="true"
        className={cn('animate-spin rounded-full border-current border-t-transparent', SIZE_CLASSES[size])}
      />
      <span className="sr-only">{label ?? t('common.loading')}</span>
    </span>
  )
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-slate-500">
      <Spinner size="lg" />
    </div>
  )
}
