import { useMemo } from 'react'
import { seriesColor } from '@/config/theme'
import { formatWeek, sameWeek, weekRange, weekSortKey } from '@/lib/weeks'
import type { ProductionRow, WeekRef } from '@/types/domain'

interface GanttChartProps {
  rows: ProductionRow[]
  /** Stable mould ordering, so a mould keeps its colour across views. */
  mouldOrder: string[]
  maxRows?: number
}

const LABEL_WIDTH = 170
const CELL_MIN = 22

/**
 * Item-by-week production timeline.
 *
 * Weeks come from `weekRange`, which walks the calendar rather than listing
 * only the weeks that appear in the data — a schedule with its idle weeks
 * collapsed would misrepresent how long the project actually runs.
 *
 * Year boundaries get a heavier rule, because the schedule runs W35→W53 then
 * W1→W4 and the jump is otherwise invisible.
 */
export function GanttChart({ rows, mouldOrder, maxRows = 80 }: GanttChartProps) {
  const { weeks, visibleRows, hiddenCount } = useMemo(() => {
    const all = rows.flatMap((row) => row.weeks)
    if (all.length === 0) {
      return {
        weeks: [] as WeekRef[],
        visibleRows: [] as ProductionRow[],
        hiddenCount: 0,
      }
    }

    const sorted = [...all].sort((a, b) => weekSortKey(a) - weekSortKey(b))
    const span = weekRange(sorted[0], sorted[sorted.length - 1])

    const ordered = [...rows]
      .filter((row) => row.weeks.length > 0)
      .sort((a, b) => weekSortKey(a.weeks[0]) - weekSortKey(b.weeks[0]))

    return {
      weeks: span,
      visibleRows: ordered.slice(0, maxRows),
      hiddenCount: Math.max(0, ordered.length - maxRows),
    }
  }, [rows, maxRows])

  if (weeks.length === 0) {
    return (
      <p className="text-xs text-(--color-ink-muted)">
        No production weeks in the current selection.
      </p>
    )
  }

  const colorFor = (mould: string | null) =>
    mould ? seriesColor(mouldOrder.indexOf(mould)) : '#94A3B8'

  const template = `${LABEL_WIDTH}px repeat(${weeks.length}, minmax(${CELL_MIN}px, 1fr))`

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: LABEL_WIDTH + weeks.length * CELL_MIN }}>
        <div
          className="sticky top-0 z-1 grid rounded-xl bg-(--color-surface-alt)"
          style={{ gridTemplateColumns: template }}
        >
          <span className="field px-2 py-1.5">Item</span>
          {weeks.map((week, index) => (
            <span
              key={`${week.year}-${week.week}`}
              className={`num py-2 text-center text-[10px] text-(--color-ink-faint) ${
                index > 0 && week.week === 1
                  ? 'border-l border-(--color-ink-faint)/25'
                  : ''
              }`}
              title={`${formatWeek(week)} · ${week.year}`}
            >
              {week.week}
            </span>
          ))}
        </div>

        <div>
          {visibleRows.map((row, rowIndex) => (
            <div
              key={`${row.item}-${row.callOff}-${rowIndex}`}
              className="grid items-center rounded-lg transition-colors hover:bg-(--color-surface-alt)"
              style={{ gridTemplateColumns: template }}
            >
              <span
                className="truncate py-1.5 pr-2 pl-2.5 text-xs"
                title={`${row.item} — ${row.qty} pcs${row.mould ? ` — ${row.mould}` : ''}`}
              >
                {row.item}
                <span className="num ml-1.5 text-[10px] text-(--color-ink-faint)">
                  {row.qty}
                </span>
              </span>

              {weeks.map((week, index) => {
                const active = row.weeks.some((w) => sameWeek(w, week))
                return (
                  <span
                    key={`${week.year}-${week.week}`}
                    className={`flex h-7 items-center justify-center ${
                      index > 0 && week.week === 1
                        ? 'border-l border-(--color-ink-faint)/25'
                        : ''
                    }`}
                    title={
                      active
                        ? `${row.item} · ${formatWeek(week)} · ${row.mould ?? 'no mould'}`
                        : undefined
                    }
                  >
                    {active && (
                      <span
                        className="h-3.5 w-full rounded-full"
                        style={{ backgroundColor: colorFor(row.mould) }}
                      />
                    )}
                  </span>
                )
              })}
            </div>
          ))}
        </div>

        {hiddenCount > 0 && (
          <p className="pt-2 text-[11px] text-(--color-ink-faint)">
            Showing {visibleRows.length} of {visibleRows.length + hiddenCount}{' '}
            scheduled entries. Narrow the filters to see the rest.
          </p>
        )}
      </div>
    </div>
  )
}
