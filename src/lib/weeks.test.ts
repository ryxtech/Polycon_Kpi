import { describe, expect, it } from 'vitest'
import {
  compareWeeks,
  earliestWeek,
  formatWeek,
  inferWrapPivot,
  isoWeeksInYear,
  latestWeek,
  nextWeek,
  resolveWeekYear,
  tokeniseWeeks,
  weekRange,
  weekSortKey,
  weekStartDate,
} from './weeks'

describe('tokeniseWeeks', () => {
  // Every one of these formats appears in the Hirslandenklinik workbook.
  it.each([
    ['37', [37]],
    ['37 + 38', [37, 38]],
    ['47 - 48', [47, 48]],
    ['38 + 39', [38, 39]],
    ['40 + 41+ 42 + 43', [40, 41, 42, 43]],
    ['44 +45 +46 + 47', [44, 45, 46, 47]],
    ['35 + 36', [35, 36]],
  ])('parses %o regardless of separator or spacing', (raw, expected) => {
    expect(tokeniseWeeks(raw, 2026, 0).map((w) => w.week)).toEqual(expected)
  })

  it('handles the year-wrapping row "52 + 53 + 1 + 2"', () => {
    const weeks = tokeniseWeeks('52 + 53 + 1 + 2', 2026, 30)
    expect(weeks).toEqual([
      { week: 52, year: 2026 },
      { week: 53, year: 2026 },
      { week: 1, year: 2027 },
      { week: 2, year: 2027 },
    ])
  })

  it('returns weeks in timeline order, not textual order', () => {
    const weeks = tokeniseWeeks('2 + 52', 2026, 30)
    expect(weeks.map((w) => `${w.year}W${w.week}`)).toEqual(['2026W52', '2027W2'])
  })

  it('de-duplicates repeated weeks', () => {
    expect(tokeniseWeeks('37 + 37 + 38', 2026, 0)).toHaveLength(2)
  })

  it.each([null, undefined, '', 'n/a', '—'])('returns nothing for %o', (raw) => {
    expect(tokeniseWeeks(raw, 2026, 0)).toEqual([])
  })

  it('ignores integers outside the ISO week range', () => {
    expect(tokeniseWeeks('0 + 54 + 99 + 37', 2026, 0).map((w) => w.week)).toEqual([37])
  })
})

describe('inferWrapPivot', () => {
  it('detects a wrap when a schedule holds both late and early weeks', () => {
    expect(inferWrapPivot([35, 43, 52, 1, 2])).toBe(30)
  })

  it('reports no wrap for a mid-year schedule', () => {
    // Beethovenstrasse runs T12..T22 and must not be pushed into the next year.
    expect(inferWrapPivot([12, 13, 14, 20, 22])).toBe(0)
  })

  it('reports no wrap for a purely late-year schedule', () => {
    expect(inferWrapPivot([35, 40, 45, 50])).toBe(0)
  })

  it('reports no wrap for an empty schedule', () => {
    expect(inferWrapPivot([])).toBe(0)
  })
})

describe('resolveWeekYear', () => {
  it('pushes weeks below the pivot into the following year', () => {
    expect(resolveWeekYear(2, 2026, 30)).toBe(2027)
    expect(resolveWeekYear(52, 2026, 30)).toBe(2026)
  })

  it('keeps every week in the base year when wrapping is disabled', () => {
    expect(resolveWeekYear(2, 2026, 0)).toBe(2026)
    expect(resolveWeekYear(52, 2026, 0)).toBe(2026)
  })
})

describe('week ordering', () => {
  it('sorts a wrapped schedule chronologically', () => {
    const weeks = [
      { week: 2, year: 2027 },
      { week: 35, year: 2026 },
      { week: 53, year: 2026 },
    ]
    const sorted = [...weeks].sort(compareWeeks).map((w) => `${w.year}W${w.week}`)
    expect(sorted).toEqual(['2026W35', '2026W53', '2027W2'])
  })

  it('gives a wrapped week a higher sort key than a late base-year week', () => {
    expect(weekSortKey({ week: 1, year: 2027 })).toBeGreaterThan(
      weekSortKey({ week: 53, year: 2026 }),
    )
  })

  it('finds the earliest and latest across a year boundary', () => {
    const weeks = [
      { week: 3, year: 2027 },
      { week: 35, year: 2026 },
      { week: 50, year: 2026 },
    ]
    expect(earliestWeek(weeks)).toEqual({ week: 35, year: 2026 })
    expect(latestWeek(weeks)).toEqual({ week: 3, year: 2027 })
  })

  it('returns null for an empty list', () => {
    expect(earliestWeek([])).toBeNull()
    expect(latestWeek([])).toBeNull()
  })
})

describe('weekStartDate', () => {
  // Cross-checked against Python's date.fromisocalendar.
  it.each([
    [{ week: 35, year: 2026 }, '2026-08-24'],
    [{ week: 37, year: 2026 }, '2026-09-07'],
    [{ week: 41, year: 2026 }, '2026-10-05'],
    [{ week: 43, year: 2026 }, '2026-10-19'],
    [{ week: 1, year: 2027 }, '2027-01-04'],
  ])('resolves %o to the correct Monday', (ref, expected) => {
    expect(weekStartDate(ref).toISOString().slice(0, 10)).toBe(expected)
  })
})

describe('isoWeeksInYear', () => {
  it('knows 2026 has 53 weeks and 2027 has 52', () => {
    expect(isoWeeksInYear(2026)).toBe(53)
    expect(isoWeeksInYear(2027)).toBe(52)
  })
})

describe('nextWeek', () => {
  it('rolls a 53-week year over into week 1', () => {
    expect(nextWeek({ week: 53, year: 2026 })).toEqual({ week: 1, year: 2027 })
  })

  it('advances within a year', () => {
    expect(nextWeek({ week: 37, year: 2026 })).toEqual({ week: 38, year: 2026 })
  })
})

describe('weekRange', () => {
  it('includes weeks with nothing scheduled so gaps stay visible', () => {
    const range = weekRange({ week: 35, year: 2026 }, { week: 39, year: 2026 })
    expect(range.map(formatWeek)).toEqual(['W35', 'W36', 'W37', 'W38', 'W39'])
  })

  it('spans the year boundary', () => {
    const range = weekRange({ week: 52, year: 2026 }, { week: 2, year: 2027 })
    expect(range).toEqual([
      { week: 52, year: 2026 },
      { week: 53, year: 2026 },
      { week: 1, year: 2027 },
      { week: 2, year: 2027 },
    ])
  })
})
