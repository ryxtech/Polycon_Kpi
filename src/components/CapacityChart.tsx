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

const PLOT_HEIGHT = 168

/**
 * Planned pieces against what the week's moulds can actually make.
 *
 * The earlier version plotted pieces alone and left capacity pressure to bar
 * colour. That put the wrong quantity in the geometry: a busy week with plenty
 * of moulds drew taller than a breaching week with few, so the shape argued
 * against the colour and the reader had to consult a legend to resolve it.
 *
 * Here each column carries a pale track sized to the week's capacity. The bar
 * is the plan. Grey showing above the bar is headroom; a bar standing proud of
 * the track is a breach. Both read as shape before any colour or label is
 * decoded — which is also what makes the chart survive colour blindness and
 * greyscale printing.
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
  // The scale must cover capacity too, or a full track would clip at the top.
  const peak = Math.max(...load.map((week) => Math.max(week.pieces, week.pieceCapacity)))
  const ticks = niceTicks(peak)
  const scaleMax = ticks[ticks.length - 1]
  const breaches = load.filter((week) => week.overCapacity)

  return (
    <div>
      <ReadingGuide total={load.length} breaches={breaches.length} />

      <div className="flex gap-2 pt-1">
        <div
          className="relative w-7 shrink-0"
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
          <div className="relative" style={{ minWidth: load.length * 26 }}>
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
              {load.map((week, index) => (
                <WeekColumn
                  key={`${week.week.year}-${week.week.week}`}
                  week={week}
                  index={index}
                  scaleMax={scaleMax}
                  reduced={reduced}
                  highlight={highlight}
                  onSelectWeek={onSelectWeek}
                />
              ))}
            </div>

            <div className="mt-2 flex gap-[3px]">
              {load.map((week) => {
                const selected = highlight === formatWeek(week.week)
                return (
                  <span
                    key={`${week.week.year}-${week.week.week}`}
                    className={`num min-w-4 flex-1 text-center text-[10px] ${
                      selected
                        ? 'font-bold text-(--color-ink)'
                        : 'text-(--color-ink-faint)'
                    }`}
                  >
                    {week.week.week}
                  </span>
                )
              })}
            </div>
          </div>
          <p className="field mt-1 text-center">ISO week</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-(--color-gridline) pt-3 text-xs text-(--color-ink-muted)">
        <Key>
          <span
            aria-hidden="true"
            className="inline-flex h-3.5 w-3 items-end overflow-hidden rounded-[3px] bg-(--color-surface-sunken)"
          >
            <span
              className="block w-full rounded-[3px]"
              style={{ height: '55%', backgroundColor: PALETTE.primary }}
            />
          </span>
          Planned, with grey headroom above
        </Key>
        <Key>
          <span
            aria-hidden="true"
            className="inline-flex h-3.5 w-3 items-end overflow-hidden rounded-[3px] bg-(--color-surface-sunken)"
          >
            <span
              className="block w-full rounded-[3px]"
              style={{
                height: '100%',
                backgroundColor: STATUS_COLOR['limited-buffer'],
              }}
            />
          </span>
          Fills the track — no headroom
        </Key>
        <Key>
          <span
            aria-hidden="true"
            className="inline-flex h-3.5 w-3 items-end overflow-hidden rounded-[3px] bg-(--color-surface-sunken)"
          >
            <span
              className="block w-full rounded-[3px]"
              style={{ height: '125%', backgroundColor: STATUS_COLOR.critical }}
            />
          </span>
          Taller than the track — beyond capacity
        </Key>
        <span className="ml-auto text-(--color-ink-faint)">
          {PROCESS.piecesPerMouldPerDay} pc/mould/day ·{' '}
          {PIECES_PER_MOULD_PER_WEEK} pcs per mould per week
        </span>
      </div>

      <style>{`@keyframes grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }`}</style>
    </div>
  )
}

/**
 * One week: a capacity track with the plan drawn inside it.
 *
 * Breaching weeks carry their overage as a label on the bar. Labelling every
 * week would be unreadable at thirty columns, and labelling none is what sent
 * the reader to the legend in the first place — so only the exceptions are
 * called out, which is where the eye should land anyway.
 */
function WeekColumn({
  week,
  index,
  scaleMax,
  reduced,
  highlight,
  onSelectWeek,
}: {
  week: WeekLoad
  index: number
  scaleMax: number
  reduced: boolean
  highlight: string | null
  onSelectWeek?: (week: string | null) => void
}) {
  const key = formatWeek(week.week)
  const selected = highlight === key
  const dimmed = highlight !== null && !selected

  const barHeight = scaleMax === 0 ? 0 : (week.pieces / scaleMax) * 100
  const trackHeight = scaleMax === 0 ? 0 : (week.pieceCapacity / scaleMax) * 100

  const color = week.overCapacity
    ? STATUS_COLOR.critical
    : week.tightCapacity
      ? STATUS_COLOR['limited-buffer']
      : PALETTE.primary

  // Rounded up, never to nearest: an even weekly spread can put a week over by
  // a fraction of a piece, and "+0" on a bar flagged as a breach reads as a bug.
  const overBy = Math.ceil(week.pieces - week.pieceCapacity)
  const spare = Math.floor(week.pieceCapacity - week.pieces)

  const title =
    week.pieceCapacity === 0
      ? `${key} · ${formatPieces(week.pieces)} pcs planned · no mould assigned, so capacity cannot be checked`
      : week.overCapacity
        ? `${key} · ${formatPieces(week.pieces)} pcs planned against ${week.pieceCapacity} the ${week.mouldCount} active ${week.mouldCount === 1 ? 'mould' : 'moulds'} can make — ${overBy} too many. Select to see what is in this week.`
        : `${key} · ${formatPieces(week.pieces)} pcs planned against ${week.pieceCapacity} capacity from ${week.mouldCount} ${week.mouldCount === 1 ? 'mould' : 'moulds'} · ${spare} spare. Select to see what is in this week.`

  const plot = (
    <span className="relative block w-full" style={{ height: '100%' }}>
      {/* Capacity track. Its top edge is the ceiling the bar is judged against. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 rounded-t-md bg-(--color-surface-sunken)"
        style={{
          height: `${trackHeight}%`,
          opacity: dimmed ? 0.4 : 1,
          transition: 'opacity 180ms ease',
        }}
      />
      <span
        className="absolute inset-x-0 bottom-0 rounded-t-md"
        style={{
          height: `${Math.max(barHeight, 2)}%`,
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
      {week.overCapacity && !dimmed && (
        <span
          aria-hidden="true"
          className="num absolute inset-x-0 text-center text-[10px] font-bold"
          style={{
            bottom: `calc(${Math.max(barHeight, 2)}% + 3px)`,
            color: STATUS_COLOR.critical,
          }}
        >
          +{overBy}
        </span>
      )}
    </span>
  )

  return (
    <div className="flex h-full min-w-4 flex-1 flex-col justify-end">
      {onSelectWeek ? (
        <button
          type="button"
          title={title}
          aria-label={title}
          aria-pressed={selected}
          onClick={() => onSelectWeek(selected ? null : key)}
          className="flex h-full w-full cursor-pointer flex-col justify-end"
        >
          {plot}
        </button>
      ) : (
        <span title={title} className="flex h-full flex-col justify-end">
          {plot}
        </span>
      )}
    </div>
  )
}

/**
 * What the chart shows and what to do with it, before the chart itself.
 *
 * A reader who has to infer the question a visual answers will usually infer
 * the wrong one. Stating the count of problem weeks up front also means the
 * headline survives on a printed page, where nothing can be hovered.
 */
function ReadingGuide({ total, breaches }: { total: number; breaches: number }) {
  return (
    <p className="mb-3 text-[13px] leading-relaxed text-(--color-ink-muted)">
      {breaches === 0 ? (
        <>
          Every one of these <strong className="text-(--color-ink)">{total} weeks</strong>{' '}
          fits within what its moulds can make.
        </>
      ) : (
        <>
          <strong className="text-(--color-ink)">
            {breaches} of {total} weeks
          </strong>{' '}
          plan more pieces than their moulds can make.
        </>
      )}{' '}
      <span className="text-(--color-ink-faint)">
        Select a week to see what is in it.
      </span>
    </p>
  )
}

function Key({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1.5">{children}</span>
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
