import type { ProductionRow, WeekRef } from '@/types/domain'
import { formatWeek } from './weeks'

/**
 * A selection made by clicking a mark on the canvas.
 *
 * One dimension at a time. Stacking filters is a power-user feature that costs
 * a lot of explaining, and on a report whose whole premise is being understood
 * in ten seconds, "click again to change, click the same mark to clear" is a
 * rule a client can hold in their head.
 */
export type CrossFilter =
  | { dimension: 'week'; value: string }
  | { dimension: 'mould'; value: string }
  | { dimension: 'callOff'; value: number }

/** Does this row belong to the current selection? */
export function matchesFilter(row: ProductionRow, filter: CrossFilter): boolean {
  switch (filter.dimension) {
    case 'week':
      return row.weeks.some((week) => formatWeek(week) === filter.value)
    case 'mould':
      return row.mould === filter.value
    case 'callOff':
      return row.callOff === filter.value
  }
}

/** Rows in the current selection, or every row when nothing is selected. */
export function applyCrossFilter(
  rows: ProductionRow[],
  filter: CrossFilter | null,
): ProductionRow[] {
  if (!filter) return rows
  return rows.filter((row) => matchesFilter(row, filter))
}

/**
 * Human-readable description of the selection.
 *
 * Shown in the filter bar so the reader is never left wondering why a figure
 * dropped — an unexplained filtered number is worse than no filter at all.
 */
export function describeFilter(filter: CrossFilter): {
  dimension: string
  value: string
} {
  switch (filter.dimension) {
    case 'week':
      return { dimension: 'Week', value: filter.value }
    case 'mould':
      return { dimension: 'Mould', value: filter.value }
    case 'callOff':
      return {
        dimension: 'Call-off',
        value: String(filter.value).padStart(2, '0'),
      }
  }
}

/** True when the two selections refer to the same mark — used to toggle off. */
export function sameFilter(
  a: CrossFilter | null,
  b: CrossFilter | null,
): boolean {
  if (!a || !b) return a === b
  return a.dimension === b.dimension && a.value === b.value
}

/** Convenience constructor so callers never build the shape by hand. */
export const filterBy = {
  week: (week: WeekRef | string): CrossFilter => ({
    dimension: 'week',
    value: typeof week === 'string' ? week : formatWeek(week),
  }),
  mould: (name: string): CrossFilter => ({ dimension: 'mould', value: name }),
  callOff: (callOff: number): CrossFilter => ({
    dimension: 'callOff',
    value: callOff,
  }),
}
