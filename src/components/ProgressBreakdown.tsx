import { COPY } from '@/config/copy'
import { PALETTE, STATUS_COLOR } from '@/config/theme'
import { prefersReducedMotion } from '@/lib/motion'

interface ProgressBreakdownProps {
  planned: number
  /** Null until the source carries a completed-quantity field. */
  completed: number | null
}

/**
 * Planned / Completed / Remaining, as the brief's first-screen sketch asks for.
 *
 * Only `planned` can be drawn today. Rather than omit the other two — which
 * would quietly drop a requirement — they are rendered as empty tracks with the
 * reason attached, so the shape of the finished visual is visible and the gap
 * is named. This is the same posture the progress tiles take.
 */
export function ProgressBreakdown({ planned, completed }: ProgressBreakdownProps) {
  const reduced = prefersReducedMotion()
  const remaining = completed === null ? null : Math.max(planned - completed, 0)

  const rows = [
    { label: 'Planned', value: planned, color: PALETTE.primary },
    { label: 'Completed', value: completed, color: STATUS_COLOR['on-schedule'] },
    { label: 'Remaining', value: remaining, color: PALETTE.violet },
  ]

  return (
    <div>
      <ul className="space-y-3">
        {rows.map((row, index) => {
          const known = row.value !== null
          const ratio = known && planned > 0 ? (row.value as number) / planned : 0

          return (
            <li key={row.label}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] font-medium text-(--color-ink)">
                  {row.label}
                </span>
                <span
                  className="num text-[13px] font-bold"
                  style={{ color: known ? PALETTE.ink : PALETTE.inkFaint }}
                >
                  {known ? row.value : '—'}
                  <span className="ml-1 font-medium text-(--color-ink-faint)">
                    pcs
                  </span>
                </span>
              </div>

              <div
                className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-(--color-surface-sunken)"
                role="img"
                aria-label={`${row.label}: ${known ? row.value : 'not available'} of ${planned} pieces`}
              >
                {known && (
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${ratio * 100}%`,
                      backgroundColor: row.color,
                      transformOrigin: 'left',
                      animation: reduced
                        ? undefined
                        : `slide 620ms cubic-bezier(0.22,1,0.36,1) ${index * 90}ms both`,
                    }}
                  />
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {completed === null && (
        <p className="mt-3.5 border-t border-(--color-gridline) pt-3 text-[11px] leading-relaxed text-(--color-ink-faint)">
          {COPY.completionPending}
        </p>
      )}
    </div>
  )
}
