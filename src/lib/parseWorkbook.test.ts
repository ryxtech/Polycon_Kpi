import { describe, expect, it } from 'vitest'
import {
  isFlagTruthy,
  normaliseMouldName,
  normaliseRows,
  parseAvailability,
  type RawRow,
} from './parseWorkbook'

describe('parseAvailability', () => {
  it('reads READY TO SPRAY as a state, not a date', () => {
    // 81 of the 107 source rows carry this string. Coercing it to a Date yields
    // Invalid Date and turns every downstream buffer into NaN.
    expect(parseAvailability('READY TO SPRAY')).toEqual({ kind: 'ready' })
  })

  it('tolerates casing and stray whitespace around the state', () => {
    expect(parseAvailability('  Ready To  Spray ')).toEqual({ kind: 'ready' })
  })

  it('keeps a real Date as a date', () => {
    const date = new Date(Date.UTC(2026, 7, 20))
    expect(parseAvailability(date)).toEqual({ kind: 'date', date })
  })

  it('parses an ISO date string', () => {
    const result = parseAvailability('2026-08-28')
    expect(result.kind).toBe('date')
    if (result.kind === 'date') {
      expect(result.date.toISOString().slice(0, 10)).toBe('2026-08-28')
    }
  })

  it('converts an Excel serial date', () => {
    // 46264 is 2026-08-20 in the 1900 date system.
    const result = parseAvailability('46264')
    expect(result.kind).toBe('date')
  })

  it.each([null, undefined, '', 'TBC', 'n/a'])(
    'reports %o as unknown rather than guessing',
    (value) => {
      expect(parseAvailability(value).kind).toBe('unknown')
    },
  )
})

describe('normaliseMouldName', () => {
  it('collapses the "NHK 10" spelling onto "NHK10"', () => {
    expect(normaliseMouldName('NHK 10')).toBe('NHK10')
    expect(normaliseMouldName('nhk10')).toBe('NHK10')
  })

  it.each([null, undefined, '', '#N/A'])('returns null for %o', (value) => {
    expect(normaliseMouldName(value)).toBeNull()
  })
})

describe('isFlagTruthy', () => {
  it.each(['x', 'X', 'yes', 'TRUE', '1', 'done', 'Complete', 'OK'])(
    'treats %o as completed',
    (value) => {
      expect(isFlagTruthy(value)).toBe(true)
    },
  )

  it.each([null, undefined, '', 'no', 'pending', '0'])(
    'treats %o as not completed',
    (value) => {
      expect(isFlagTruthy(value)).toBe(false)
    },
  )
})

describe('normaliseRows', () => {
  const base: RawRow[] = [
    ['SL-300 FP 31', 8, 2, 'NHK7', 'READY TO SPRAY', '37 + 38 + 39'],
    ['SL-300 BP 01', 3, 1, 'NHK 10', '2026-08-13', '37'],
  ]

  it('normalises quantities, mould names and weeks together', () => {
    const [first, second] = normaliseRows(base, 2026)
    expect(first.qty).toBe(8)
    expect(first.weeks.map((w) => w.week)).toEqual([37, 38, 39])
    expect(second.mould).toBe('NHK10')
  })

  it('leaves produced null when no flag column exists', () => {
    expect(normaliseRows(base, 2026).every((row) => row.produced === null)).toBe(true)
  })

  it('reads a flag column into a produced quantity', () => {
    const flagged: RawRow[] = [
      ['SL-300 FP 31', 8, 2, 'NHK7', 'READY TO SPRAY', '37', 'x'],
      ['SL-300 FP 32', 4, 2, 'NHK7', 'READY TO SPRAY', '37', ''],
    ]
    const rows = normaliseRows(flagged, 2026)
    expect(rows[0].produced).toBe(8)
    expect(rows[1].produced).toBe(0)
  })

  it('accepts a numeric produced quantity directly', () => {
    const partial: RawRow[] = [
      ['SL-300 FP 37', 13, 2, 'NHK7', 'READY TO SPRAY', '40', 5],
    ]
    expect(normaliseRows(partial, 2026)[0].produced).toBe(5)
  })

  it('drops rows with no item', () => {
    const withBlank: RawRow[] = [...base, ['', null, null, null, null, '']]
    expect(normaliseRows(withBlank, 2026)).toHaveLength(2)
  })

  it('preserves the raw week text for the raw-data view', () => {
    expect(normaliseRows(base, 2026)[0].weeksRaw).toBe('37 + 38 + 39')
  })

  it('infers no year wrap for a mid-year schedule', () => {
    // Beethovenstrasse weeks T12..T22 must stay in the base year.
    const midYear: RawRow[] = [
      ['BES3', 3, 1, 'BES3', 'READY TO SPRAY', '13 + 14'],
      ['BES10', 13, 2, 'BES10', 'READY TO SPRAY', '20 + 21 + 22'],
    ]
    const rows = normaliseRows(midYear, 2026)
    expect(rows.flatMap((r) => r.weeks).every((w) => w.year === 2026)).toBe(true)
  })

  it('infers a year wrap when the schedule spans the boundary', () => {
    const wrapping: RawRow[] = [
      ['A', 1, 1, 'NHK7', 'READY TO SPRAY', '35'],
      ['B', 1, 1, 'NHK7', 'READY TO SPRAY', '52 + 53 + 1 + 2'],
    ]
    const rows = normaliseRows(wrapping, 2026)
    const weekTwo = rows[1].weeks.find((w) => w.week === 2)
    expect(weekTwo?.year).toBe(2027)
  })
})
