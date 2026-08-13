/**
 * What is actually happening inside one week.
 *
 * The capacity chart answers "which weeks are a problem". This answers the
 * question that immediately follows — "what is in this one, and why is it a
 * problem" — which the chart alone can never show, because a bar has room for
 * exactly one number.
 *
 * The even spread here mirrors `computeWeeklyLoad` deliberately. If the two
 * diverged, the panel would contradict the bar directly above it, which is a
 * worse failure than either being approximate.
 */

import { PIECES_PER_MOULD_PER_WEEK, PROCESS } from '@/config/process'
import type { ProductionRow, WeekRef } from '@/types/domain'
import { sameWeek, weekEndDate, weekStartDate } from './weeks'

/** One product's contribution to a week. */
export interface WeekItem {
  item: string
  mould: string | null
  callOff: number | null
  /** Pieces attributed to this week. */
  pieces: number
  /** Total pieces for the item across every week it appears in. */
  totalQty: number
  /** How many weeks the item is spread across; 1 means the figure is exact. */
  spread: number
}

/** One mould's load within a week. */
export interface WeekMould {
  name: string
  pieces: number
  items: number
  /** A single mould yields one piece per working day. */
  capacity: number
}

export interface WeekDetail {
  week: WeekRef
  start: Date
  /** Sunday. Kept for callers that need the calendar week. */
  end: Date
  /**
   * Friday.
   *
   * Every figure in this object counts five working days, so showing a
   * Monday–Sunday span beside them invites the reader to divide the work across
   * seven. The production week is the one worth naming.
   */
  workingEnd: Date
  /** Pieces planned into the week. */
  pieces: number
  /** Pieces the week's active moulds can produce. */
  capacity: number
  mouldCount: number
  moulds: WeekMould[]
  items: WeekItem[]
  /** Pieces beyond capacity; 0 when the week fits. */
  overBy: number
  /** Unused capacity; 0 when the week is full or over. */
  spare: number
  utilisation: number
  verdict: 'over' | 'tight' | 'ok'
  /** True when any item's figure is an even split rather than a stated number. */
  approximate: boolean
}

/**
 * Builds the detail for one week.
 *
 * Returns null when the week holds nothing, so the caller renders no panel
 * rather than an empty one.
 */
export function describeWeek(
  rows: ProductionRow[],
  week: WeekRef,
): WeekDetail | null {
  const items: WeekItem[] = []
  const mouldTotals = new Map<string, { pieces: number; items: number }>()
  let pieces = 0
  let approximate = false

  for (const row of rows) {
    if (row.weeks.length === 0) continue
    if (!row.weeks.some((candidate) => sameWeek(candidate, week))) continue

    const share = row.qty / row.weeks.length
    if (row.weeks.length > 1) approximate = true
    pieces += share

    items.push({
      item: row.item,
      mould: row.mould,
      callOff: row.callOff,
      pieces: share,
      totalQty: row.qty,
      spread: row.weeks.length,
    })

    if (row.mould) {
      const total = mouldTotals.get(row.mould) ?? { pieces: 0, items: 0 }
      total.pieces += share
      total.items += 1
      mouldTotals.set(row.mould, total)
    }
  }

  if (items.length === 0) return null

  const moulds: WeekMould[] = [...mouldTotals.entries()]
    .map(([name, total]) => ({
      name,
      pieces: total.pieces,
      items: total.items,
      capacity: PIECES_PER_MOULD_PER_WEEK,
    }))
    // Heaviest first: the mould driving a breach should be the one read first.
    .sort((a, b) => b.pieces - a.pieces || a.name.localeCompare(b.name))

  const capacity = moulds.length * PIECES_PER_MOULD_PER_WEEK
  const utilisation = capacity === 0 ? 0 : pieces / capacity

  const start = weekStartDate(week)
  const workingEnd = new Date(start)
  workingEnd.setDate(start.getDate() + PROCESS.workingDaysPerWeek - 1)

  return {
    week,
    start,
    end: weekEndDate(week),
    workingEnd,
    pieces,
    capacity,
    mouldCount: moulds.length,
    moulds,
    items: items.sort((a, b) => b.pieces - a.pieces || a.item.localeCompare(b.item)),
    overBy: Math.max(pieces - capacity, 0),
    spare: Math.max(capacity - pieces, 0),
    utilisation,
    verdict: utilisation > 1 ? 'over' : utilisation >= 0.85 ? 'tight' : 'ok',
    approximate,
  }
}

/**
 * The week's headline, in the terms a production office already uses.
 *
 * Written as a full sentence rather than a label because the reader's question
 * is "so can we do it or not" — a phrase like "112% utilisation" makes them do
 * the interpreting themselves.
 */
export function summariseWeek(detail: WeekDetail): string {
  const planned = Math.round(detail.pieces)

  if (detail.mouldCount === 0) {
    return `${planned} ${plural(planned)} planned, but no mould is assigned — capacity cannot be checked.`
  }

  if (detail.verdict === 'over') {
    const over = overagePieces(detail)
    return `${over} ${plural(over)} more than these moulds can make this week.`
  }

  if (detail.verdict === 'tight') {
    const spare = headroomPieces(detail)
    return spare === 0
      ? 'Full to capacity — any delay pushes work into the next week.'
      : `Nearly full: ${spare} ${plural(spare)} of headroom left.`
  }

  const spare = headroomPieces(detail)
  return `Comfortable — ${spare} ${plural(spare)} of headroom left.`
}

/**
 * Whole pieces beyond capacity, always rounded up.
 *
 * Spreading a multi-week row evenly produces fractional pieces, so a week can
 * be genuinely over capacity by less than one. Rounding to nearest then prints
 * "0 pieces more" on a week the model has flagged as a breach — the label
 * contradicting the test that produced it. Nothing can be made in fractions,
 * so any overage at all costs a whole piece of capacity.
 */
export function overagePieces(detail: WeekDetail): number {
  return Math.ceil(detail.overBy)
}

/** Whole pieces of headroom, always rounded down, for the same reason. */
export function headroomPieces(detail: WeekDetail): number {
  return Math.floor(detail.spare)
}

/**
 * The capacity arithmetic, written out.
 *
 * Showing the calculation rather than its result is what lets someone check the
 * dashboard against what they know, instead of having to trust it.
 */
export function explainCapacity(detail: WeekDetail): string {
  if (detail.mouldCount === 0) return 'No mould assigned, so no capacity to compare against.'

  return (
    `${detail.mouldCount} ${detail.mouldCount === 1 ? 'mould' : 'moulds'} × ` +
    `${PROCESS.workingDaysPerWeek} working days × ` +
    `${PROCESS.piecesPerMouldPerDay} pc/mould/day = ` +
    `${detail.capacity} pcs capacity`
  )
}

function plural(count: number): string {
  return count === 1 ? 'piece' : 'pieces'
}
