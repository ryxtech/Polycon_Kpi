import { describe, expect, it } from 'vitest'
import {
  BEETHOVENSTRASSE,
  HIRSLANDENKLINIK,
  REFERENCE_DATE,
  SPECIMEN,
} from '@/data/projects'
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

  it('finds no mould at readiness risk on this dataset', () => {
    // Every buffer is comfortable; the exposure is in production duration.
    expect(moulds.every((m) => m.bufferDays === null || m.bufferDays > 7)).toBe(true)
  })
})

/**
 * Production duration, from Marek's rule: one piece per mould per working day.
 * A quantity is therefore a duration, and a window either holds it or does not.
 */
describe('mould feasibility', () => {
  const moulds = summariseMoulds(rows, REFERENCE_DATE)
  const byName = new Map(moulds.map((m) => [m.name, m]))

  it('turns the remaining quantity into working days one-for-one', () => {
    expect(byName.get('NHK7')?.productionDaysRequired).toBe(104)
    expect(byName.get('NHK4')?.productionDaysRequired).toBe(47)
  })

  it('assumes nothing produced when the source records no completion', () => {
    // Worst case, and labelled as such wherever it is shown.
    expect(byName.get('NHK4')?.producedPieces).toBeNull()
    expect(byName.get('NHK4')?.remainingPieces).toBe(47)
  })

  it('counts the working days still remaining, not the window as planned', () => {
    // NHK4 runs W35 to W43. The reference date precedes W35, so the whole
    // nine-week window is still ahead: 45 working days.
    expect(byName.get('NHK4')?.availableWorkingDays).toBe(45)
    expect(byName.get('NHK4')?.windowClosed).toBe(false)
  })

  it('finds NHK4 infeasible by two working days', () => {
    const nhk4 = byName.get('NHK4')
    expect(nhk4?.feasible).toBe(false)
    expect(nhk4?.dayShortfall).toBe(-2)
  })

  it('escalates an infeasible mould to critical regardless of its buffer', () => {
    // NHK4 is READY TO SPRAY with a comfortable buffer; the window is the
    // problem, and that is the more severe fact.
    expect(byName.get('NHK4')?.status).toBe('critical')
  })

  it('leaves the other nine moulds feasible', () => {
    expect(moulds.filter((m) => !m.feasible).map((m) => m.name)).toEqual(['NHK4'])
  })

  it('gives NHK7 the longest run but still inside its window', () => {
    const nhk7 = byName.get('NHK7')
    expect(nhk7?.productionDaysRequired).toBe(104)
    expect(nhk7?.availableWorkingDays).toBe(115)
    expect(nhk7?.feasible).toBe(true)
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

  it("sets each week's ceiling from its active moulds, not a plant-wide limit", () => {
    // Marek's rule: one piece per mould per working day. Four moulds running
    // in a week can therefore yield 20 pieces, however many forms the plant
    // can *manufacture* at once.
    const week36 = load.find((w) => w.week.week === 36)
    expect(week36?.mouldCount).toBe(4)
    expect(week36?.pieceCapacity).toBe(4 * PROCESS.workingDaysPerWeek)
  })

  it('finds W36 planning more pieces than its four moulds can produce', () => {
    const week36 = load.find((w) => w.week.week === 36)
    expect(week36?.pieces).toBeCloseTo(23, 0)
    expect(week36?.pieceCapacity).toBe(20)
    expect(week36?.overCapacity).toBe(true)
  })

  it('leaves W37 comfortable despite carrying the most moulds', () => {
    // Six moulds yield 30 pcs, so 21 planned is well inside — the opposite of
    // what a naive "most moulds = worst week" reading would conclude.
    const week37 = load.find((w) => w.week.week === 37)
    expect(week37?.mouldCount).toBe(6)
    expect(week37?.pieceCapacity).toBe(30)
    expect(week37?.overCapacity).toBe(false)
  })

  it('flags six weeks that cannot deliver what is planned into them', () => {
    const over = load.filter((week) => week.overCapacity).map((w) => w.week.week)
    expect(over.sort((a, b) => a - b)).toEqual([2, 36, 39, 47, 48, 51])
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

/**
 * Marek's worked example, end to end:
 *
 *   "if there are planned 13 pcs and 5 pcs are already produced, then remain
 *    just 8 pcs … production follows 1 pc / 1 mould / 1 day"
 *
 * The schedule risk is therefore 8 days of work against the days still left,
 * not 13 against the original window.
 */
describe("recording completion changes what the schedule risk is", () => {
  const withProgress = summariseMoulds(SPECIMEN.rows, REFERENCE_DATE)
  const byName = new Map(withProgress.map((m) => [m.name, m]))

  it('subtracts produced pieces from the quantity to get the work left', () => {
    const nhk4 = byName.get('NHK4')
    expect(nhk4?.totalQty).toBe(47)
    expect(nhk4?.producedPieces).toBe(22)
    expect(nhk4?.remainingPieces).toBe(25)
  })

  it('needs one working day per remaining piece, not per planned piece', () => {
    expect(byName.get('NHK4')?.productionDaysRequired).toBe(25)
  })

  it('clears NHK4 once its progress is known', () => {
    // The identical schedule reads as a two-day breach without completion data
    // and as twenty days of slack with it. This is the whole argument for
    // adding the column.
    const nhk4 = byName.get('NHK4')
    expect(nhk4?.feasible).toBe(true)
    expect(nhk4?.dayShortfall).toBe(20)
  })

  it('leaves every mould feasible once progress is recorded', () => {
    expect(withProgress.filter((m) => !m.feasible)).toEqual([])
  })

  it('never reports negative work remaining', () => {
    // An over-recorded produced figure must not produce a negative duration.
    const over = summariseMoulds(
      SPECIMEN.rows.map((row) => ({ ...row, produced: row.qty + 5 })),
      REFERENCE_DATE,
    )
    expect(over.every((m) => m.remainingPieces === 0)).toBe(true)
    expect(over.every((m) => m.feasible)).toBe(true)
  })
})
