import { useId, useState, type ReactNode } from 'react'
import { cn } from '../../utils/cn'

/*
 * Small SVG charts for the platform panel, drawn to one set of rules: one hue per chart (the identity
 * amber on the main series, slate for the rest), straight segments, square-cornered columns on a zero
 * baseline, 3-5 faint gridlines with round ticks, no legend for a single series. Text (ticks, labels,
 * readouts) is HTML laid over the SVG, so it keeps its size when the plot stretches.
 */

/** Round step for 3-4 ticks over `max`: 1, 2 or 5 times a power of ten. */
function niceStep(max: number, ticks = 4): number {
  const raw = Math.max(max, 1) / ticks
  const power = 10 ** Math.floor(Math.log10(raw))
  const unit = raw / power
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * power
}

const percentOf = (value: number, total: number) => `${(value / total) * 100}%`

/** Trend line for a KPI: twelve points, the last one marked. Decorative: the value and change carry the meaning. */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const width = 88
  const height = 28
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const points = values.map((value, index) => [
    (index / (values.length - 1)) * (width - 4) + 2,
    height - 3 - ((value - min) / span) * (height - 6),
  ])
  const last = points[points.length - 1]
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn('h-7 w-[88px] overflow-visible', className)} aria-hidden="true">
      <polyline points={points.map((point) => point.join(',')).join(' ')} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" className="text-slate-400" />
      <circle cx={last[0]} cy={last[1]} r="2.5" className="fill-brand" />
    </svg>
  )
}

/** Frame shared by the charts: a fixed 36px lane for the y ticks, then the plot with its overlays. */
function ChartFrame({ label, ticks, children }: { label: string; ticks: { value: number; top: string; text: string }[]; children: ReactNode }) {
  return (
    <figure className="relative pl-9">
      <figcaption className="sr-only">{label}</figcaption>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8" aria-hidden="true">
        {ticks.map((tick) => (
          <span key={tick.value} className="num absolute right-0 -translate-y-1/2 text-[11px] text-slate-500" style={{ top: tick.top }}>
            {tick.text}
          </span>
        ))}
      </div>
      <div className="relative">{children}</div>
    </figure>
  )
}

export interface ColumnDatum {
  label: string
  /** Shown under the column when set (every few days). */
  tick?: string
  value: number
}

/**
 * Columns per period with a hover readout. `formatValue` writes ticks and the readout; `muted` greys the
 * columns that are context (past months) so the current one carries the hue.
 */
export function ColumnChart({
  data,
  height = 180,
  formatValue = (value) => String(value),
  label,
  muted,
}: {
  data: ColumnDatum[]
  height?: number
  formatValue?: (value: number) => string
  label: string
  muted?: (datum: ColumnDatum, index: number) => boolean
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const max = Math.max(...data.map((datum) => datum.value), 1)
  const step = niceStep(max)
  const top = Math.ceil(max / step) * step
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step)
  const width = 600
  const plotHeight = height - 22
  const slot = width / data.length
  const barWidth = Math.max(1.5, slot * (data.length > 40 ? 0.62 : 0.68))
  const y = (value: number) => plotHeight - (value / top) * (plotHeight - 6)
  const active = hovered === null ? null : data[hovered]

  return (
    <ChartFrame label={label} ticks={ticks.map((tick) => ({ value: tick, top: percentOf(y(tick), height), text: formatValue(tick) }))}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="block w-full" style={{ height }} role="img" aria-label={label} onMouseLeave={() => setHovered(null)}>
        {ticks.map((tick) => (
          <line key={tick} x1={0} x2={width} y1={y(tick)} y2={y(tick)} className={tick === 0 ? 'stroke-slate-300' : 'stroke-slate-100'} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        {data.map((datum, index) => {
          const isMuted = muted?.(datum, index) ?? false
          return (
            <g key={datum.label} onMouseEnter={() => setHovered(index)}>
              <rect x={index * slot} y={0} width={slot} height={plotHeight} fill="transparent" />
              <rect
                x={index * slot + (slot - barWidth) / 2}
                y={y(datum.value)}
                width={barWidth}
                height={Math.max(0, plotHeight - y(datum.value))}
                className={cn('transition-[fill] duration-150', hovered === index ? 'fill-accent' : isMuted ? 'fill-slate-300' : 'fill-brand')}
              />
            </g>
          )
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {data.map((datum, index) =>
          datum.tick ? (
            <span key={datum.label} className="num absolute bottom-0 -translate-x-1/2 text-[11px] whitespace-nowrap text-slate-500" style={{ left: percentOf(index * slot + slot / 2, width) }}>
              {datum.tick}
            </span>
          ) : null,
        )}
      </div>
      {active && hovered !== null && (
        <div
          className="num pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-xs whitespace-nowrap text-white shadow-[0_6px_16px_rgba(15,23,42,0.25)] dark:bg-slate-800"
          style={{ left: `${Math.min(88, Math.max(12, ((hovered * slot + slot / 2) / width) * 100))}%` }}
        >
          {active.label} · {formatValue(active.value)}
        </div>
      )}
    </ChartFrame>
  )
}

/** Line of a rate over time (0-100), with its last value labelled at the end. */
export function RateLine({ values, labels, label, height = 150 }: { values: number[]; labels: string[]; label: string; height?: number }) {
  const gradientId = useId()
  const width = 600
  const max = Math.max(...values)
  const step = niceStep(max, 3)
  const top = Math.ceil((max * 1.08) / step) * step
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step)
  const plotHeight = height - 22
  // Room on the right for the last value's label.
  const x = (index: number) => 8 + (index / (values.length - 1)) * (width - 70)
  const y = (value: number) => plotHeight - (value / top) * (plotHeight - 8)
  const points = values.map((value, index) => `${x(index)},${y(value)}`).join(' ')
  const lastIndex = values.length - 1

  return (
    <ChartFrame label={label} ticks={ticks.map((tick) => ({ value: tick, top: percentOf(y(tick), height), text: `${tick}%` }))}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="block w-full" style={{ height }} role="img" aria-label={label}>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.14" />
            <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => (
          <line key={tick} x1={0} x2={width} y1={y(tick)} y2={y(tick)} className={tick === 0 ? 'stroke-slate-300' : 'stroke-slate-100'} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        <polygon points={`${x(0)},${y(0)} ${points} ${x(lastIndex)},${y(0)}`} fill={`url(#${gradientId})`} />
        <polyline points={points} fill="none" className="stroke-brand" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {labels.map((text, index) =>
          index % 3 === 0 || index === lastIndex ? (
            <span key={text + index} className="num absolute bottom-0 -translate-x-1/2 text-[11px] whitespace-nowrap text-slate-500" style={{ left: percentOf(x(index), width) }}>
              {text}
            </span>
          ) : null,
        )}
        <span className="num absolute -translate-y-1/2 pl-1.5 text-xs font-semibold text-slate-900" style={{ left: percentOf(x(lastIndex), width), top: percentOf(y(values[lastIndex]), height) }}>
          {values[lastIndex].toFixed(1)}%
        </span>
      </div>
    </ChartFrame>
  )
}
