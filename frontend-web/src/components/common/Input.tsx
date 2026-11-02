import { Eye, EyeOff } from 'lucide-react'
import { useId, useState, type ComponentPropsWithRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'
import { fieldClasses } from './fieldClasses'
import { FieldShell } from './FieldShell'

interface InputProps extends ComponentPropsWithRef<'input'> {
  label: string
  error?: string
  hint?: string
  leftIcon?: ReactNode
}

/** Text field with label and message. Password fields get an eye button that shows what was typed. */
export function Input({ label, error, hint, leftIcon, id, className, required, type, ...rest }: InputProps) {
  const { t } = useTranslation()
  const generatedId = useId()
  const inputId = id ?? generatedId
  const messageId = `${inputId}-message`
  const isPassword = type === 'password'
  const [isRevealed, setIsRevealed] = useState(false)

  return (
    <FieldShell
      inputId={inputId}
      messageId={messageId}
      label={label}
      required={required}
      error={error}
      hint={hint}
      className={className}
    >
      <div className="relative">
        {leftIcon != null && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          type={isPassword && isRevealed ? 'text' : type}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          className={cn(
            fieldClasses(Boolean(error)),
            'h-9',
            leftIcon != null && 'pl-9',
            // Edge draws its own eye inside password fields; ours replaces it.
            isPassword && 'pr-10 [&::-ms-reveal]:hidden',
          )}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setIsRevealed((revealed) => !revealed)}
            aria-label={isRevealed ? t('common.hidePassword') : t('common.showPassword')}
            aria-pressed={isRevealed}
            aria-controls={inputId}
            title={isRevealed ? t('common.hidePassword') : t('common.showPassword')}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-slate-400 transition-colors hover:text-ink focus-visible:text-ink"
          >
            {isRevealed ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
          </button>
        )}
      </div>
    </FieldShell>
  )
}
