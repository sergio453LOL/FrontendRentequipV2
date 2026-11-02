import type { StripeElementChangeEvent } from '@stripe/stripe-js'
import { useId, useState, type ReactNode } from 'react'
import { cn } from '../../utils/cn'
import { fieldClasses } from '../common/fieldClasses'
import { FieldShell } from '../common/FieldShell'

export interface StripeFieldHandlers {
  id: string
  onChange: (event: StripeElementChangeEvent) => void
  onFocus: () => void
  onBlur: () => void
}

interface StripeCardFieldProps {
  label: string
  error?: string
  /** Renders the Stripe element with the handlers that keep this field's look in sync. */
  children: (handlers: StripeFieldHandlers) => ReactNode
  onChange: (event: StripeElementChangeEvent) => void
}

/**
 * Label, border and error message around a Stripe card element, so it looks like the app's Input.
 * The element lives in an iframe, so focus is tracked through its events instead of CSS.
 */
export function StripeCardField({ label, error, children, onChange }: StripeCardFieldProps) {
  const id = useId()
  const [isFocused, setIsFocused] = useState(false)

  return (
    <FieldShell inputId={id} messageId={`${id}-message`} label={label} required error={error}>
      <div
        className={cn(
          fieldClasses(Boolean(error)),
          'flex h-9 items-center',
          isFocused && (error ? 'border-red-500 ring-2 ring-red-200' : 'border-ink ring-2 ring-slate-200'),
        )}
      >
        <div className="w-full">
          {children({ id, onChange, onFocus: () => setIsFocused(true), onBlur: () => setIsFocused(false) })}
        </div>
      </div>
    </FieldShell>
  )
}
