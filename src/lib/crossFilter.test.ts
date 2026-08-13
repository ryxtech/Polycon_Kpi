import { describe, expect, it } from 'vitest'
import { HIRSLANDENKLINIK, REFERENCE_DATE } from '@/data/projects'
import { computeKpis } from './derive'
import {
  applyCrossFilter,
  describeFilter,
  filterBy,
  matchesFilter,
  sameFilter,
} from './crossFilter'

const rows = HIRSLANDENKLINIK.rows

describe('applyCrossFilter', () => {
  it('returns every row when nothing is selected', () => {
    expect(applyCrossFilter(rows, null)).toHaveLength(rows.length)
  })

  it('filters to the rows scheduled in a week', () => {
    const filtered = applyCrossFilter(rows, filterBy.week('W37'))
    expect(filtered.length).toBeGreaterThan(0)
    expect(
      filtered.every((row) => row.weeks.some((week) => week.week === 37)),
    ).toBe(true)
  })

  it('keeps a multi-week row when any of its weeks match', () => {
    // A row reading "37 + 38" belongs to both weeks; dropping it from either
    // would understate that week's load.
    const spanning = rows.find((row) => row.weeks.length > 1)
    expect(spanning).toBeDefined()
    const week = spanning!.weeks[1]
    const filtered = applyCrossFilter(rows, filterBy.week(`W${week.week}`))
    expect(filtered).toContain(spanning)
  })

  it('filters to a mould', () => {
    const filtered = applyCrossFilter(rows, filterBy.mould('NHK7'))
    expect(filtered).toHaveLength(37)
    expect(filtered.every((row) => row.mould === 'NHK7')).toBe(true)
  })

  it('filters to a call-off', () => {
    const filtered = applyCrossFilter(rows, filterBy.callOff(2))
    expect(filtered.every((row) => row.callOff === 2)).toBe(true)
    expect(filtered.reduce((sum, row) => sum + row.qty, 0)).toBe(45)
  })

  it('returns nothing for a selection that matches no row', () => {
    expect(applyCrossFilter(rows, filterBy.mould('NHK99'))).toEqual([])
  })
})

describe('filtered figures reconcile with the headline', () => {
  it('sums the four call-off selections back to the project total', () => {
    // The whole point of cross-filtering is that the parts still make the
    // whole. If they ever stop doing so, a client will find it before we do.
    const total = [1, 2, 3, 4]
      .map((callOff) => applyCrossFilter(rows, filterBy.callOff(callOff)))
      .reduce((sum, subset) => sum + subset.reduce((s, row) => s + row.qty, 0), 0)

    expect(total).toBe(computeKpis(rows, REFERENCE_DATE).totalPieces)
  })

  it('sums every mould selection back to the project total', () => {
    const moulds = [...new Set(rows.map((row) => row.mould))].filter(
      (m): m is string => m !== null,
    )
    const total = moulds
      .map((mould) => applyCrossFilter(rows, filterBy.mould(mould)))
      .reduce((sum, subset) => sum + subset.reduce((s, row) => s + row.qty, 0), 0)

    expect(total).toBe(245)
  })

  it('derives a filtered subset through the same KPI pipeline', () => {
    const filtered = applyCrossFilter(rows, filterBy.mould('NHK7'))
    const kpis = computeKpis(filtered, REFERENCE_DATE)
    expect(kpis.totalPieces).toBe(104)
    expect(kpis.uniqueItems).toBe(31)
    expect(kpis.mouldCount).toBe(1)
  })

  it('never invents a completion figure inside a selection', () => {
    const filtered = applyCrossFilter(rows, filterBy.week('W37'))
    const kpis = computeKpis(filtered, REFERENCE_DATE)
    expect(kpis.producedPieces).toBeNull()
    expect(kpis.completionRatio).toBeNull()
  })
})

describe('sameFilter', () => {
  it('recognises the same mark so a repeat click clears it', () => {
    expect(sameFilter(filterBy.week('W37'), filterBy.week('W37'))).toBe(true)
    expect(sameFilter(filterBy.mould('NHK7'), filterBy.mould('NHK7'))).toBe(true)
  })

  it('separates the same value on different dimensions', () => {
    expect(sameFilter(filterBy.week('W37'), filterBy.mould('W37'))).toBe(false)
  })

  it('treats two empty selections as equal', () => {
    expect(sameFilter(null, null)).toBe(true)
    expect(sameFilter(null, filterBy.week('W37'))).toBe(false)
  })
})

describe('describeFilter', () => {
  it('labels each dimension for the filter bar', () => {
    expect(describeFilter(filterBy.week('W37'))).toEqual({
      dimension: 'Week',
      value: 'W37',
    })
    expect(describeFilter(filterBy.mould('NHK7'))).toEqual({
      dimension: 'Mould',
      value: 'NHK7',
    })
  })

  it('pads a call-off so it reads like the source document', () => {
    expect(describeFilter(filterBy.callOff(2)).value).toBe('02')
  })
})

describe('matchesFilter', () => {
  it('is the predicate applyCrossFilter is built from', () => {
    const filter = filterBy.mould('NHK7')
    expect(rows.filter((row) => matchesFilter(row, filter))).toEqual(
      applyCrossFilter(rows, filter),
    )
  })
})
