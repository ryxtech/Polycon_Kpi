import { describe, expect, it } from 'vitest'
import { BEETHOVENSTRASSE, HIRSLANDENKLINIK, REFERENCE_DATE } from '@/data/projects'
import { PROCESS } from '@/config/process'
import {
  classifyBuffer,
  computeKpis,
  computeWeeklyLoad,
  summariseCallOffs,
  summariseMoulds,
} from './derive'

const rows = HIRSLANDENKLINIK.rows

/**
 * These figures are the regression fixture for the whole application. They were
 * computed independently from the source workbook; if a refactor changes them,
 * the dashboard is lying to a client.
 */
describe('Hirslandenklinik headline figures', () => {
  const kpis = computeKpis(rows, REFERENCE_DATE)

  it('carries 107 data rows', () => {
    expect(rows).toHaveLength(107)
  })

  it('totals 245 pieces', () => {
    expect(kpis.totalPieces).toBe(245)
  })

  it('counts 88 unique items', () => {
    expect(kpis.uniqueItems).toBe(88)
  })

  it('counts 10 moulds', () => {
    expect(kpis.mouldCount).toBe(10)
  })

  it('counts 4 call-offs', () => {
    expect(kpis.callOffCount).toBe(4)
  })

  it('splits moulds into 4 ready and 6 pending', () => {
    expect(kpis.mouldsReady).toBe(4)
    expect(kpis.mouldsPending).toBe(6)
  })
})

describe('completed quantity', () => {
  it('reports null rather than inventing a figure', () => {
    const kpis = computeKpis(rows, REFERENCE_DATE)
    expect(kpis.producedPieces).toBeNull()
    expect(kpis.completionRatio).toBeNull()
  })

  it('computes progress once a production flag is present', () => {
    const flagged = rows.map((row, index) => ({
      ...row,
      produced: index < 10 ? row.qty : 0,
    }))
    const kpis = computeKpis(flagged, REFERENCE_DATE)
    expect(kpis.producedPieces).toBeGreaterThan(0)
    expect(kpis.completionRatio).toBeCloseTo(
      (kpis.producedPieces ?? 0) / kpis.totalPieces,
    )
  })
})

describe('a project documented only by a published form schedule', () => {
  const kpis = computeKpis(
    BEETHOVENSTRASSE.rows,
    REFERENCE_DATE,
    BEETHOVENSTRASSE.encodedMoulds,
  )

  it('carries no element rows', () => {
    // The only element data is a plotted Gantt; transcribing it produced totals
    // that contradicted the form schedule, so none was kept.
    expect(BEETHOVENSTRASSE.rows).toHaveLength(0)
  })

  it('takes its totals from the form schedule rather than showing zeroes', () => {
    expect(kpis.totalPieces).toBe(234)
    expect(kpis.uniqueItems).toBe(66)
    expect(kpis.mouldCount).toBe(13)
  })

  it('counts 4 forms on schedule and 9 needing attention', () => {
    expect(kpis.mouldsReady).toBe(4)
    expect(kpis.mouldsPending).toBe(9)
  })

  it('claims no schedule it cannot support', () => {
    expect(kpis.firstWeek).toBeNull()
    expect(kpis.lastWeek).toBeNull()
    expect(kpis.nextProductionWeek).toBeNull()
    expect(kpis.callOffCount).toBe(0)
    expect(kpis.producedPieces).toBeNull()
  })

  it('derives no mould buffers, since there is nothing to derive them from', () => {
    expect(summariseMoulds(BEETHOVENSTRASSE.rows, REFERENCE_DATE)).toEqual([])
  })

  it('reconciles the form schedule to its own published totals', () => {
    const forms = BEETHOVENSTRASSE.encodedMoulds ?? []
    expect(forms).toHaveLength(13)
    expect(forms.reduce((sum, f) => sum + f.totalQty, 0)).toBe(234)
    expect(forms.filter((f) => f.status === 'critical')).toHaveLength(6)
    expect(forms.filter((f) => f.status === 'limited-buffer')).toHaveLength(3)
  })
})

describe('summariseMoulds', () => {
  const moulds = summariseMoulds(rows, REFERENCE_DATE)
  const byName = new Map(moulds.map((m) => [m.name, m]))

  // Independently computed from the workbook: distinct products, scheduled
  // entries, pieces. Entries exceed products where an item is called off more
  // than once — NHK7 carries 37 entries across 31 distinct products.
  it.each([
    ['NHK1', 6, 6, 7],
    ['NHK2', 11, 11, 15],
    ['NHK3', 6, 6, 16],
    ['NHK4', 11, 14, 47],
    ['NHK5', 9, 9, 11],
    ['NHK6', 11, 21, 40],
    ['NHK7', 31, 37, 104],
    ['NHK8', 1, 1, 1],
    ['NHK9', 1, 1, 1],
    ['NHK10', 1, 1, 3],
  ])(
    '%s holds %i products across %i entries totalling %i pcs',
    (name, itemCount, scheduledRows, totalQty) => {
      const mould = byName.get(name)
      expect(mould).toBeDefined()
      expect(mould?.itemCount).toBe(itemCount)
      expect(mould?.scheduledRows).toBe(scheduledRows)
      expect(mould?.totalQty).toBe(totalQty)
    },
  )

  it('accounts for every piece across the ten moulds', () => {
    expect(moulds.reduce((sum, m) => sum + m.totalQty, 0)).toBe(245)
  })

  it('reconciles distinct products to the project total of 88', () => {
    expect(moulds.reduce((sum, m) => sum + m.itemCount, 0)).toBe(88)
  })

  it('reconciles scheduled entries to the sheet row count of 107', () => {
    expect(moulds.reduce((sum, m) => sum + m.scheduledRows, 0)).toBe(107)
  })

  it('sorts NHK2 before NHK10 rather than lexically', () => {
    const names = moulds.map((m) => m.name)
    expect(names.indexOf('NHK2')).toBeLessThan(names.indexOf('NHK10'))
  })

  it('reads READY TO SPRAY as availability, not as a date', () => {
    expect(byName.get('NHK7')?.availability).toEqual({ kind: 'ready' })
    expect(byName.get('NHK1')?.availability.kind).toBe('date')
  })

  it('measures NHK3 as the tightest buffer at 10 days', () => {
    expect(byName.get('NHK3')?.bufferDays).toBe(10)
  })

  it('finds no mould at risk on this dataset', () => {
    // The reason the risk engine is capacity-based rather than date-based.
    expect(moulds.every((m) => m.status === 'on-schedule')).toBe(true)
  })
})

describe('summariseCallOffs', () => {
  const callOffs = summariseCallOffs(rows)

  it('reproduces the four call-off quantities', () => {
    expect(callOffs.map((c) => [c.callOff, c.totalQty])).toEqual([
      [1, 101],
      [2, 45],
      [3, 40],
      [4, 59],
    ])
  })

  it('sums to the project total', () => {
    expect(callOffs.reduce((sum, c) => sum + c.totalQty, 0)).toBe(245)
  })
})

describe('computeWeeklyLoad', () => {
  const load = computeWeeklyLoad(rows)

  it('conserves every piece when spreading across multi-week rows', () => {
    const total = load.reduce((sum, week) => sum + week.pieces, 0)
    expect(total).toBeCloseTo(245, 0)
  })

  it('orders weeks across the year boundary', () => {
    const labels = load.map((w) => `${w.week.year}W${w.week.week}`)
    expect(labels[0]).toBe('2026W35')
    expect(labels[labels.length - 1]).toBe('2027W4')
  })

  it('measures capacity in form-days, not distinct moulds per week', () => {
    // Four moulds in a week is not a breach of a three-per-day limit; they can
    // run on different days. Only the form-day total can say whether it fits.
    const week36 = load.find((w) => w.week.week === 36)
    expect(week36?.mouldCount).toBe(4)
    expect(week36?.formDaysRequired).toBe(4 * PROCESS.formProductionDays)
    expect(week36?.overCapacity).toBe(false)
    expect(week36?.tightCapacity).toBe(false)
  })

  it('identifies weeks 37 and 43 as the tightest at 6 moulds', () => {
    const tight = load.filter((week) => week.tightCapacity || week.overCapacity)
    expect(tight.map((w) => w.week.week).sort((a, b) => a - b)).toEqual([37, 43])
    expect(tight.every((w) => w.mouldCount === 6)).toBe(true)
    expect(tight.every((w) => w.utilisation === 12 / 15)).toBe(true)
  })

  it('never exceeds capacity outright on this dataset', () => {
    expect(load.some((week) => week.overCapacity)).toBe(false)
  })
})

describe('classifyBuffer', () => {
  it('treats a non-positive buffer as critical', () => {
    expect(classifyBuffer(0)).toBe('critical')
    expect(classifyBuffer(-3)).toBe('critical')
  })

  it('treats a buffer inside one working week as limited', () => {
    expect(classifyBuffer(5)).toBe('limited-buffer')
    expect(classifyBuffer(7)).toBe('limited-buffer')
  })

  it('treats a comfortable buffer as on schedule', () => {
    expect(classifyBuffer(10)).toBe('on-schedule')
    expect(classifyBuffer(46)).toBe('on-schedule')
  })

  it('does not claim a mould is fine when its buffer is unknown', () => {
    expect(classifyBuffer(null)).toBe('limited-buffer')
  })
})
