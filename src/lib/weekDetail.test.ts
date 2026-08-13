import { describe, expect, it } from 'vitest'
import { HIRSLANDENKLINIK } from '@/data/projects'
import { computeWeeklyLoad } from './derive'
import type { ProductionRow, WeekRef } from '@/types/domain'
import {
  describeWeek,
  explainCapacity,
  headroomPieces,
  overagePieces,
  summariseWeek,
} from './weekDetail'

const W36: WeekRef = { year: 2025, week: 36 }
const W37: WeekRef = { year: 2025, week: 37 }

function row(partial: Partial<ProductionRow> = {}): ProductionRow {
  return {
    item: 'SL-300 FP 1',
    qty: 10,
    callOff: 101,
    mould: 'NHK1',
    availability: { kind: 'ready' },
    weeks: [W36],
    weeksRaw: '36',
    produced: null,
    priority: null,
    ...partial,
  }
}

describe('describeWeek', () => {
  it('returns null when nothing is scheduled in the week', () => {
    expect(describeWeek([row({ weeks: [W37] })], W36)).toBeNull()
  })

  it('reports the working week Mon-Fri, matching what capacity counts', () => {
    const detail = describeWeek([row()], W36)!

    expect(detail.start.getDay()).toBe(1) // Monday
    expect(detail.workingEnd.getDay()).toBe(5) // Friday
    expect(detail.end.getDay()).toBe(0) // Sunday, kept for the calendar week
    const spanDays =
      (detail.workingEnd.getTime() - detail.start.getTime()) / 86_400_000
    expect(spanDays).toBe(4)
  })

  it('sums pieces and counts distinct moulds', () => {
    const detail = describeWeek(
      [
        row({ item: 'A', qty: 4, mould: 'NHK1' }),
        row({ item: 'B', qty: 6, mould: 'NHK2' }),
        row({ item: 'C', qty: 2, mould: 'NHK2' }),
      ],
      W36,
    )

    expect(detail?.pieces).toBe(12)
    expect(detail?.mouldCount).toBe(2)
    // 2 moulds x 5 working days x 1 pc/mould/day
    expect(detail?.capacity).toBe(10)
  })

  it('spreads a multi-week row evenly and flags the figure as approximate', () => {
    const detail = describeWeek([row({ qty: 10, weeks: [W36, W37] })], W36)

    expect(detail?.pieces).toBe(5)
    expect(detail?.approximate).toBe(true)
    expect(detail?.items[0].spread).toBe(2)
    expect(detail?.items[0].totalQty).toBe(10)
  })

  it('does not flag single-week rows as approximate', () => {
    expect(describeWeek([row()], W36)?.approximate).toBe(false)
  })

  it('reports the overage when demand exceeds capacity', () => {
    // One mould can make 5 pcs a week; 8 are planned.
    const detail = describeWeek([row({ qty: 8, mould: 'NHK1' })], W36)

    expect(detail?.verdict).toBe('over')
    expect(detail?.overBy).toBe(3)
    expect(detail?.spare).toBe(0)
  })

  it('reports headroom when the week fits', () => {
    const detail = describeWeek([row({ qty: 2, mould: 'NHK1' })], W36)

    expect(detail?.verdict).toBe('ok')
    expect(detail?.spare).toBe(3)
    expect(detail?.overBy).toBe(0)
  })

  it('treats a week at 85% or more as tight', () => {
    // 9 pcs against 2 moulds = 10 capacity -> 90%
    const detail = describeWeek(
      [row({ item: 'A', qty: 5, mould: 'NHK1' }), row({ item: 'B', qty: 4, mould: 'NHK2' })],
      W36,
    )

    expect(detail?.verdict).toBe('tight')
  })

  it('orders moulds heaviest first so the driver of a breach reads first', () => {
    const detail = describeWeek(
      [
        row({ item: 'A', qty: 2, mould: 'NHK1' }),
        row({ item: 'B', qty: 9, mould: 'NHK2' }),
      ],
      W36,
    )

    expect(detail?.moulds.map((m) => m.name)).toEqual(['NHK2', 'NHK1'])
  })

  it('handles rows with no mould without inventing capacity', () => {
    const detail = describeWeek([row({ qty: 5, mould: null })], W36)

    expect(detail?.mouldCount).toBe(0)
    expect(detail?.capacity).toBe(0)
    expect(detail?.utilisation).toBe(0)
    expect(summariseWeek(detail!)).toContain('no mould is assigned')
  })

  it('agrees with computeWeeklyLoad on the real workbook', () => {
    // The panel sits directly beneath the bar. If these ever diverged the
    // dashboard would contradict itself on screen.
    const load = computeWeeklyLoad(HIRSLANDENKLINIK.rows)
    expect(load.length).toBeGreaterThan(0)

    for (const week of load) {
      const detail = describeWeek(HIRSLANDENKLINIK.rows, week.week)
      expect(detail).not.toBeNull()
      expect(detail!.pieces).toBeCloseTo(week.pieces, 6)
      expect(detail!.capacity).toBe(week.pieceCapacity)
      expect(detail!.mouldCount).toBe(week.mouldCount)
      expect(detail!.overBy > 0).toBe(week.overCapacity)
    }
  })

  it('attributes every piece in the week to exactly one item entry', () => {
    const detail = describeWeek(HIRSLANDENKLINIK.rows, { year: 2025, week: 36 })
    if (!detail) return

    const summed = detail.items.reduce((total, item) => total + item.pieces, 0)
    expect(summed).toBeCloseTo(detail.pieces, 6)
  })
})

describe('fractional overage', () => {
  /*
   * An even weekly spread produces fractional pieces, so a week can sit just
   * over capacity. Rounding to nearest printed "0 pieces more" on a week the
   * model had flagged as a breach.
   */
  const barelyOver = () =>
    describeWeek(
      // 11 pcs over 2 weeks = 5.5 into W36, against one mould's 5.
      [row({ qty: 11, weeks: [W36, W37], mould: 'NHK1' })],
      W36,
    )!

  it('flags the week as over', () => {
    const detail = barelyOver()
    expect(detail.pieces).toBe(5.5)
    expect(detail.verdict).toBe('over')
  })

  it('never reports an overage of zero on a week it calls over', () => {
    const detail = barelyOver()
    expect(overagePieces(detail)).toBe(1)
    expect(summariseWeek(detail)).toBe('1 piece more than these moulds can make this week.')
  })

  it('rounds headroom down so a part piece is never offered as capacity', () => {
    // 7 pcs over 2 weeks = 3.5 into W36, against one mould's 5 -> 1.5 spare.
    const detail = describeWeek(
      [row({ qty: 7, weeks: [W36, W37], mould: 'NHK1' })],
      W36,
    )!
    expect(detail.spare).toBe(1.5)
    expect(headroomPieces(detail)).toBe(1)
  })

  it('keeps every week consistent between its verdict and its figure', () => {
    const load = computeWeeklyLoad(HIRSLANDENKLINIK.rows)
    for (const week of load) {
      const detail = describeWeek(HIRSLANDENKLINIK.rows, week.week)!
      if (detail.verdict === 'over') expect(overagePieces(detail)).toBeGreaterThan(0)
      else expect(overagePieces(detail)).toBe(0)
    }
  })
})

describe('summariseWeek', () => {
  it('leads with the shortfall for an over-capacity week', () => {
    const detail = describeWeek([row({ qty: 8, mould: 'NHK1' })], W36)!
    expect(summariseWeek(detail)).toBe('3 pieces more than these moulds can make this week.')
  })

  it('uses the singular for a one-piece overage', () => {
    const detail = describeWeek([row({ qty: 6, mould: 'NHK1' })], W36)!
    expect(summariseWeek(detail)).toContain('1 piece more')
  })

  it('calls a full week full rather than reporting zero headroom', () => {
    const detail = describeWeek([row({ qty: 5, mould: 'NHK1' })], W36)!
    expect(summariseWeek(detail)).toContain('Full to capacity')
  })

  it('states the headroom for a comfortable week', () => {
    const detail = describeWeek([row({ qty: 1, mould: 'NHK1' })], W36)!
    expect(summariseWeek(detail)).toContain('4 pieces of headroom')
  })

  it('never reports a percentage', () => {
    const detail = describeWeek([row({ qty: 8, mould: 'NHK1' })], W36)!
    expect(summariseWeek(detail)).not.toContain('%')
  })
})

describe('explainCapacity', () => {
  it('writes out the arithmetic so it can be checked by hand', () => {
    const detail = describeWeek(
      [row({ item: 'A', mould: 'NHK1' }), row({ item: 'B', mould: 'NHK2' })],
      W36,
    )!

    expect(explainCapacity(detail)).toBe(
      '2 moulds × 5 working days × 1 pc/mould/day = 10 pcs capacity',
    )
  })

  it('uses the singular for one mould', () => {
    const detail = describeWeek([row({ mould: 'NHK1' })], W36)!
    expect(explainCapacity(detail)).toContain('1 mould ×')
  })

  it('says plainly when there is nothing to compare against', () => {
    const detail = describeWeek([row({ mould: null })], W36)!
    expect(explainCapacity(detail)).toContain('No mould assigned')
  })
})
