import { parseSpecifications } from '../../utils/specifications'

export function SpecificationList({ specifications }: { specifications: string }) {
  const { rows, notes } = parseSpecifications(specifications)

  return (
    <div className="space-y-3">
      {rows.length > 0 && (
        <dl className="divide-y divide-rule border-y border-line">
          {rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
              <dt className="text-slate-600">{row.label}</dt>
              <dd className="num text-right font-medium text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {notes.map((note) => (
        <p key={note} className="text-sm text-slate-600">
          {note}
        </p>
      ))}
    </div>
  )
}
