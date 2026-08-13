import { PIECES_PER_MOULD_PER_WEEK, PROCESS } from '@/config/process'
import { PALETTE, STATUS_COLOR } from '@/config/theme'
import { formatPieces } from '@/lib/format'
import { prefersReducedMotion } from '@/lib/motion'
import { formatWeek } from '@/lib/weeks'
import type { WeekLoad } from '@/types/domain'

interface CapacityChartProps {
  load: WeekLoad[]
  /** Week to highlight, cross-filtered from another visual. */
  highlight?: string | null
  onSelectWeek?: (week: string | null) => void
}

const PLOT_HEIGHT = 150

/**
 * Weekly pieces, with capacity pressure encoded in the bar colour.
 *
 * The colouring is the entire point: it lays the form-day constraint from the
 * PDF over the volume figures from the workbook, which is the join the
 * spreadsheet never makes. Gridlines stay faint so they never compete, and the
 * bars grow from the baseline on mount so the shape of the schedule registers
 * before any single value does.
 */
export function CapacityChart({
  load,
  highlight = null,
  onSelectWeek,
}: CapacityChartProps) {
  if (load.length === 0) {
    return (
      <p className="text-sm text-(--color-ink-muted)">
        No scheduled production in this selection.
      </p>
    )
  }

  const reduced = prefersReducedMotion()
  const peak = Math.max(...load.map((week) => week.pieces))
  const ticks = niceTicks(peak)
  const scaleMax = ticks[ticks.length - 1]

  return (
    <div>
      <div className="flex gap-2 pt-2.5">
        <div
          className="relative w-6 shrink-0"
          style={{ height: PLOT_HEIGHT }}
          aria-hidden="true"
        >
          {ticks.map((tick) => (
            <span
              key={tick}
              className="num absolute right-0 -translate-y-1/2 text-[10px] text-(--color-ink-faint)"
              style={{ bottom: `${(tick / scaleMax) * 100}%` }}
            >
              {tick}
            </span>
          ))}
        </div>

        {/*
          Bars, gridlines and week labels share ONE horizontal scroller. Keeping
          the label row outside it let the row set the page width, which put a
          sideways scrollbar on the whole document at phone widths.
        */}
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="relative" style={{ minWidth: load.length * 19 }}>
            <div
              className="pointer-events-none absolute inset-x-0 top-0"
              style={{ height: PLOT_HEIGHT }}
              aria-hidden="true"
            >
              {ticks.map((tick) => (
                <span
                  key={tick}
                  className="absolute inset-x-0 border-t border-(--color-gridline)"
                  style={{ bottom: `${(tick / scaleMax) * 100}%` }}
                />
              ))}
            </div>

            <div
              className="relative flex items-end gap-[3px]"
              style={{ height: PLOT_HEIGHT }}
            >
              {load.map((week, index) => {
                const key = formatWeek(week.week)
                const height = scaleMax === 0 ? 0 : (week.pieces / scaleMax) * 100
                const color = week.overCapacity
                  ? STATUS_COLOR.critical
                  : week.tightCapacity
                    ? STATUS_COLOR['limited-buffer']
                    : PALETTE.primary
                const selected = highlight === key
                const dimmed = highlight !== null && !selected

                const title = `${key} · ${formatPieces(week.pieces)} pcs planned · ${week.mouldCount} ${week.mouldCount === 1 ? 'mould' : 'moulds'} can yield ${week.pieceCapacity} · ${Math.round(week.utilisation * 100)}% of capacity`

                const bar = (
                  <span
                    className="block w-full rounded-t-lg"
                    style={{
                      height: `${Math.max(height, 3)}%`,
                      backgroundColor: color,
                      opacity: dimmed ? 0.25 : 1,
                      boxShadow: selected
                        ? `0 0 0 2px ${PALETTE.surface}, 0 0 0 4px ${color}`
                        : undefined,
                      transformOrigin: 'bottom',
                      animation: reduced
                        ? undefined
                        : `grow 520ms cubic-bezier(0.22,1,0.36,1) ${Math.min(index * 22, 500)}ms both`,
                      transition: 'opacity 180ms ease, box-shadow 180ms ease',
                    }}
                  />
                )

                return (
                  <div
                    key={`${week.week.year}-${week.week.week}`}
                    className="flex h-full min-w-4 flex-1 flex-col justify-end"
                  >
                    {onSelectWeek ? (
                      <button
                        type="button"
                        title={title}
                        aria-label={title}
                        aria-pressed={selected}
                        onClick={() => onSelectWeek(selected ? null : key)}
                        className="flex h-full w-full cursor-pointer flex-col justify-end"
                      >
                        {bar}
                      </button>
                    ) : (
                      <span title={title} className="flex h-full flex-col justify-end">
                        {bar}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-2 flex gap-[3px]">
              {load.map((week) => (
                <span
                  key={`${week.week.year}-${week.week.week}`}
                  className="num min-w-4 flex-1 text-center text-[10px] text-(--color-ink-faint)"
                >
                  {week.week.week}
                </span>
              ))}
            </div>
          </div>
          <p className="field mt-1 text-center">ISO week</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-(--color-gridline) pt-3 text-xs text-(--color-ink-muted)">
        <Swatch color={PALETTE.primary} label="Within capacity" />
        <Swatch color={STATUS_COLOR['limited-buffer']} label="No headroom" />
        <Swatch color={STATUS_COLOR.critical} label="Beyond mould capacity" />
        <span className="ml-auto text-(--color-ink-faint)">
          {PROCESS.piecesPerMouldPerDay} pc/mould/day ·{' '}
          {PIECES_PER_MOULD_PER_WEEK} pcs per mould per week
        </span>
      </div>

      <style>{`@keyframes grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }`}</style>
    </div>
  )
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  )
}

/** Round axis ticks — arbitrary maxima make a chart hard to read off. */
function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 1]
  const magnitude = 10 ** Math.floor(Math.log10(max))
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => max / s <= 4) ?? magnitude
  const top = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let value = 0; value <= top + 1e-9; value += step) ticks.push(Math.round(value))
  return ticks
}
