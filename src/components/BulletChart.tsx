import { PALETTE, STATUS_COLOR } from '@/config/theme'
import { prefersReducedMotion } from '@/lib/motion'
import type { RiskLevel } from '@/types/domain'

export interface BulletRow {
  label: string
  /** Measured value, in the same unit as `max`. */
  value: number
  /** Full scale. */
  max: number
  /** Optional target marker, drawn as a vertical rule. */
  target?: number
  /** Value shown at the end of the row. Defaults to `value`. */
  display?: string
  level?: RiskLevel
  note?: string
}

interface BulletChartProps {
  rows: BulletRow[]
  /** Label shown against the target marker in the legend. */
  targetLabel?: string
}

/**
 * Bullet rows — the densest honest way to show several measures on one scale.
 *
 * Chosen over gauges because this dashboard always has more than one measure to
 * show at once and gauges do not tile. Every value is printed as text beside its
 * bar, so the chart stays readable without relying on length or colour.
 */
export function BulletChart({ rows, targetLabel = 'Target' }: BulletChartProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-(--color-ink-muted)">No measures to show.</p>
  }

  const reduced = prefersReducedMotion()

  return (
    <div>
      <ul className="space-y-3">
        {rows.map((row, index) => {
          const ratio = row.max === 0 ? 0 : Math.min(row.value / row.max, 1)
          const color = row.level ? STATUS_COLOR[row.level] : PALETTE.primary
          const targetRatio =
            row.target !== undefined && row.max > 0
              ? Math.min(row.target / row.max, 1)
              : null

          return (
            <li key={row.label}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[13px] font-medium text-(--color-ink)">
                  {row.label}
                </span>
                <span className="num shrink-0 text-[13px] font-bold">
                  {row.display ?? row.value}
                </span>
              </div>

              <div
                className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-(--color-surface-sunken)"
                role="img"
                aria-label={`${row.label}: ${row.display ?? row.value}${
                  row.target !== undefined ? `, ${targetLabel} ${row.target}` : ''
                }`}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${ratio * 100}%`,
                    backgroundColor: color,
                    transformOrigin: 'left',
                    animation: reduced
                      ? undefined
                      : `slide 620ms cubic-bezier(0.22,1,0.36,1) ${Math.min(index * 55, 440)}ms both`,
                  }}
                />
                {targetRatio !== null && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 w-0.5 rounded-full bg-(--color-ink)"
                    style={{ left: `${targetRatio * 100}%` }}
                  />
                )}
              </div>

              {row.note && (
                <p className="mt-1 text-[11px] text-(--color-ink-faint)">{row.note}</p>
              )}
            </li>
          )
        })}
      </ul>

      {rows.some((row) => row.target !== undefined) && (
        <p className="mt-3 flex items-center gap-1.5 border-t border-(--color-gridline) pt-2.5 text-[11px] text-(--color-ink-faint)">
          <span aria-hidden="true" className="inline-block h-3 w-0.5 rounded-full bg-(--color-ink)" />
          {targetLabel}
        </p>
      )}

      <style>{`@keyframes slide { from { transform: scaleX(0); } to { transform: scaleX(1); } }`}</style>
    </div>
  )
}
