import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Database, FlaskConical, Search, X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils/cn'

/*
 * Building blocks of the platform panel. Flat white panels with one quiet border on the slate ground,
 * 8px corners on panels and 6px on controls, figures in tabular digits. Colour is kept for data, status
 * and the one action that moves money or a company.
 */

export function Panel({ className, children, as: Tag = 'section', ...rest }: { className?: string; children: ReactNode; as?: 'section' | 'div' | 'article'; 'aria-labelledby'?: string }) {
  return (
    <Tag className={cn('min-w-0 rounded-lg border border-slate-200/80 bg-white', className)} {...rest}>
      {children}
    </Tag>
  )
}

export function PanelHeader({ id, title, meta, actions, className }: { id?: string; title: string; meta?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <header className={cn('flex flex-wrap items-center gap-x-3 gap-y-2 px-4 pt-4 pb-3 sm:px-5', className)}>
      <div className="min-w-0 flex-1">
        <h2 id={id} className="text-[15px] font-semibold text-slate-900">
          {title}
        </h2>
        {meta && <p className="mt-0.5 text-[13px] text-slate-500">{meta}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

/** Title row of a module: the noun, one sentence about its data, where the data comes from, its actions. */
export function AdminPageHeader({ title, subtitle, source, actions }: { title: string; subtitle?: ReactNode; source: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end gap-x-4 gap-y-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-slate-900 sm:text-2xl">{title}</h1>
          {source}
        </div>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/**
 * Where a module's data comes from, said quietly next to its title: demonstration data, or the backend
 * with demonstration rows after the real ones.
 */
export function SourceBadge({ kind, detail }: { kind: 'demo' | 'mixed'; detail?: string }) {
  const { t } = useTranslation()
  const Icon = kind === 'demo' ? FlaskConical : Database
  const label = kind === 'demo' ? t('admin.demo.badge') : t('admin.demo.mixed')
  return (
    <span
      title={detail ?? (kind === 'demo' ? t('admin.demo.demoHint') : undefined)}
      className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border border-dashed border-slate-300 px-2 text-xs font-medium text-slate-600"
    >
      <Icon className="size-3.5 text-slate-500" strokeWidth={1.75} aria-hidden="true" />
      {label}
      {detail && <span className="sr-only">: {detail}</span>}
    </span>
  )
}

/** Marks a demonstration row inside a list that also holds backend rows. */
export function DemoMark() {
  const { t } = useTranslation()
  return (
    <span title={t('admin.demo.rowHint')} className="ml-1.5 inline-flex h-4 shrink-0 items-center rounded-sm bg-slate-100 px-1 align-middle text-[11px] font-medium text-slate-500">
      {t('admin.demo.row')}
    </span>
  )
}

export type PillTone = 'green' | 'amber' | 'blue' | 'red' | 'slate' | 'orange'

const PILL_TONES: Record<PillTone, { pill: string; dot: string }> = {
  green: { pill: 'bg-emerald-50 text-emerald-800', dot: 'bg-status-green' },
  amber: { pill: 'bg-amber-50 text-amber-800', dot: 'bg-status-amber' },
  blue: { pill: 'bg-blue-50 text-blue-800', dot: 'bg-status-blue' },
  red: { pill: 'bg-red-50 text-red-800', dot: 'bg-status-red' },
  slate: { pill: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
  orange: { pill: 'bg-orange-50 text-action-ink', dot: 'bg-action' },
}

/** A status: pale tint with darker text of the same hue and a dot of the exact colour. Never squeezed. */
export function Pill({ tone, children, className }: { tone: PillTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex h-[22px] flex-none items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap', PILL_TONES[tone].pill, className)}>
      <span className={cn('size-1.5 rounded-full', PILL_TONES[tone].dot)} aria-hidden="true" />
      {children}
    </span>
  )
}

/** A quiet tag for a property (Destacado, Sugerido por IA): outline, no fill. */
export function Tag({ children, icon, tone = 'slate' }: { children: ReactNode; icon?: ReactNode; tone?: 'slate' | 'amber' }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 flex-none items-center gap-1 rounded px-1.5 text-[11px] font-medium whitespace-nowrap ring-1 ring-inset',
        tone === 'amber' ? 'text-accent-ink ring-amber-200' : 'text-slate-600 ring-slate-200',
      )}
    >
      {icon}
      {children}
    </span>
  )
}

/**
 * Tabs or a segmented control whose active marker slides between options (`layoutId`). `variant="underline"`
 * sits on a full-width rule; `"segmented"` is a compact track for periods and views.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  layoutId,
  label,
  variant = 'segmented',
  className,
}: {
  options: { value: T; label: string; count?: number }[]
  value: T
  onChange: (value: T) => void
  layoutId: string
  label: string
  variant?: 'segmented' | 'underline'
  className?: string
}) {
  if (variant === 'underline') {
    return (
      <div role="tablist" aria-label={label} className={cn('-mx-1 flex gap-1 overflow-x-auto border-b border-slate-200 px-1 [scrollbar-width:none]', className)}>
        {options.map((option) => {
          const isActive = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(option.value)}
              className={cn(
                'relative flex h-10 shrink-0 items-center gap-2 px-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                'focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand',
                isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800',
              )}
            >
              {option.label}
              {option.count !== undefined && (
                <span className={cn('num rounded px-1.5 text-xs', isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600')}>{option.count}</span>
              )}
              {isActive && (
                <motion.span layoutId={layoutId} layoutDependency={value} className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-brand" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
              )}
            </button>
          )
        })}
      </div>
    )
  }
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex h-8 shrink-0 items-center rounded-md bg-slate-100 p-0.5', className)}>
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative h-7 rounded-[5px] px-2.5 text-xs font-semibold whitespace-nowrap transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand',
              isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800',
            )}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                layoutDependency={value}
                className="absolute inset-0 rounded-[5px] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Toolbar search: filters as you type. */
export function SearchField({ id, value, onChange, placeholder, className }: { id: string; value: string; onChange: (value: string) => void; placeholder: string; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
        {placeholder}
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="h-9 w-full rounded-md border border-slate-300 bg-white pr-3 pl-8 text-sm text-slate-900 placeholder:text-slate-500 focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
      />
    </div>
  )
}

/** Native select styled as a toolbar control: keyboard and phones get their own picker. */
export function SelectField<T extends string>({
  id,
  label,
  value,
  onChange,
  options,
  className,
}: {
  id: string
  label: string
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-9 w-full appearance-none rounded-md border border-slate-300 bg-white pr-8 pl-3 text-sm text-slate-800 focus:border-brand focus:ring-2 focus:ring-brand/30 focus:outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
    </div>
  )
}

/** On/off switch. Green when on: the semantic "live" colour, not the brand. */
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (checked: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50',
        checked ? 'bg-emerald-600' : 'bg-slate-300',
      )}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 600, damping: 36 }}
        className={cn('size-4 rounded-full bg-white shadow-[0_1px_2px_rgba(15,23,42,0.25)]', checked ? 'ml-[18px]' : 'ml-0.5')}
      />
    </button>
  )
}

/** Grey bar standing in for a value while it loads, at the value's own size. */
export function Bar({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('block rounded bg-slate-100', className)} />
}

/** One sentence across an empty block, which keeps its frame and header. */
export function EmptyBlock({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mx-4 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600 sm:mx-5">
      <span>{children}</span>
      {action}
    </div>
  )
}

/** Inline error for a block that failed, with a retry. */
export function BlockError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <div role="alert" className="mx-4 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800 sm:mx-5">
      <span>{message}</span>
      <button type="button" onClick={onRetry} className="font-semibold underline-offset-2 hover:underline">
        {t('common.retry')}
      </button>
    </div>
  )
}

/**
 * Side sheet for the detail of one row. Slides in from the right (full width on phones), closes with
 * Escape, the backdrop or the X, and gives focus back to where it was.
 */
export function Drawer({ isOpen, onClose, title, subtitle, children, footer }: { isOpen: boolean; onClose: () => void; title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const { t } = useTranslation()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [isOpen, onClose])

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 bg-slate-950/40"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 40 }}
            className="relative flex h-full w-full max-w-[520px] flex-col bg-white shadow-[-12px_0_40px_rgba(15,23,42,0.18)] outline-none"
          >
            <header className="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="text-base font-semibold text-slate-900">
                  {title}
                </h2>
                {subtitle && <div className="mt-1 text-[13px] text-slate-500">{subtitle}</div>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('common.close')}
                className="-mr-1.5 flex size-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                <X className="size-5" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
            {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
