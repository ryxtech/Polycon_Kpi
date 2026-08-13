import { describe, expect, it } from 'vitest'
import { BEETHOVENSTRASSE, HIRSLANDENKLINIK, REFERENCE_DATE } from '@/data/projects'
import { computeWeeklyLoad, summariseMoulds } from './derive'
import {
  assembleFindings,
  findCapacityConflicts,
  findEncodedMouldRisks,
  findInfeasibleMoulds,
  findLoadImbalance,
  findMouldRisks,
  overallLevel,
} from './risk'

const rows = HIRSLANDENKLINIK.rows
const load = computeWeeklyLoad(rows)
const moulds = summariseMoulds(rows, REFERENCE_DATE)

describe('findCapacityConflicts', () => {
  const conflicts = findCapacityConflicts(load)

  it('flags the six weeks that plan more than their moulds can produce', () => {
    // Capacity is set by the moulds actually running that week, at one piece
    // per mould per working day.
    const over = conflicts
      .filter((f) => f.level === 'critical')
      .map((f) => f.title.match(/W(\d+)/)?.[1])
      .map(Number)
      .sort((a, b) => a - b)
    expect(over).toEqual([2, 36, 39, 47, 48, 51])
  })

  it('shows the arithmetic so the claim can be checked', () => {
    const w36 = conflicts.find((f) => f.title.startsWith('W36'))
    expect(w36?.detail).toContain('4 moulds')
    expect(w36?.detail).toContain('ceiling of 20')
    expect(w36?.detail).toContain('1 pc/mould/day')
  })

  it('rates a breach as critical and a tight week as attention', () => {
    expect(conflicts.some((f) => f.level === 'critical')).toBe(true)
    expect(conflicts.some((f) => f.level === 'limited-buffer')).toBe(true)
  })

  it('does not flag the week carrying the most moulds', () => {
    // W37 runs six moulds, so it can yield 30 pcs against 21 planned. "Most
    // moulds" and "worst week" are different things, and only the rate tells
    // them apart.
    expect(conflicts.some((f) => f.title.startsWith('W37'))).toBe(false)
  })

  it('produces nothing when every week has headroom', () => {
    const within = load.map((week) => ({
      ...week,
      pieces: 1,
      pieceCapacity: 20,
      utilisation: 0.05,
      overCapacity: false,
      tightCapacity: false,
    }))
    expect(findCapacityConflicts(within)).toEqual([])
  })
})

describe('findInfeasibleMoulds', () => {
  const findings = findInfeasibleMoulds(moulds)

  it('finds the one mould that cannot finish in the time it has left', () => {
    expect(findings).toHaveLength(1)
    expect(findings[0].title).toBe('NHK4 cannot finish in the time left')
  })

  it('states the shortfall in working days with the arithmetic behind it', () => {
    expect(findings[0].detail).toContain('47 pcs outstanding')
    expect(findings[0].detail).toContain('47 working days')
    expect(findings[0].detail).toContain('45 working days remain')
    expect(findings[0].detail).toContain('Short by 2 days')
  })

  it('says the full quantity was assumed when no completion is recorded', () => {
    // Otherwise the reader cannot tell a measured shortfall from a worst case.
    expect(findings[0].detail).toContain('no completion recorded')
  })

  it('rates an unachievable window as critical', () => {
    expect(findings[0].level).toBe('critical')
  })

  it('says nothing when every mould fits', () => {
    const feasible = moulds.map((mould) => ({
      ...mould,
      feasible: true,
      dayShortfall: 5,
    }))
    expect(findInfeasibleMoulds(feasible)).toEqual([])
  })
})

describe('findMouldRisks', () => {
  // These operate on readiness buffers alone, so the fixture is normalised to
  // on-schedule first — feasibility is a separate finding with its own test.
  const clear = moulds.map((mould) => ({
    ...mould,
    status: 'on-schedule' as const,
  }))

  it('reports reassurance rather than nothing when all moulds are clear', () => {
    // An empty panel reads as broken; the tightest buffer is the useful fact.
    const findings = findMouldRisks(clear)
    expect(findings).toHaveLength(1)
    expect(findings[0].level).toBe('on-schedule')
    expect(findings[0].title).toContain('All 10 moulds')
    expect(findings[0].detail).toContain('NHK3')
  })

  it('surfaces a mould that cannot be ready in time', () => {
    const exposed = clear.map((mould, index) =>
      index === 0 ? { ...mould, status: 'critical' as const, bufferDays: -4 } : mould,
    )
    const findings = findMouldRisks(exposed)
    expect(findings).toHaveLength(1)
    expect(findings[0].level).toBe('critical')
    expect(findings[0].refs).toEqual([exposed[0].name])
  })
})

describe('findLoadImbalance', () => {
  it('detects the front-loaded shape of this schedule', () => {
    const findings = findLoadImbalance(load)
    expect(findings).toHaveLength(1)
    expect(findings[0].title).toBe('Production load is front-loaded')
  })

  it('stays quiet on an evenly loaded schedule', () => {
    const even = load.map((week) => ({ ...week, pieces: 10 }))
    expect(findLoadImbalance(even)).toEqual([])
  })

  it('leads the assembled findings with the infeasible mould', () => {
    const findings = assembleFindings({ load, moulds })
    expect(findings[0].id).toBe('infeasible-NHK4')
  })

  it('stays quiet on a schedule too short to judge', () => {
    expect(findLoadImbalance(load.slice(0, 3))).toEqual([])
  })
})

describe('findEncodedMouldRisks', () => {
  const findings = findEncodedMouldRisks(BEETHOVENSTRASSE.encodedMoulds ?? [])

  it('surfaces the six late forms and the three tight ones', () => {
    expect(findings.filter((f) => f.level === 'critical')).toHaveLength(6)
    expect(findings.filter((f) => f.level === 'limited-buffer')).toHaveLength(3)
  })

  it('leads with the form that is furthest behind', () => {
    expect(findings[0].title).toBe('BES14 will not be ready on time')
    expect(findings[0].detail).toContain('5 working days')
  })

  it('omits forms that are on schedule', () => {
    const names = findings.flatMap((f) => f.refs)
    expect(names).not.toContain('BES1')
    expect(names).not.toContain('BES8')
  })
})

describe('assembleFindings', () => {
  it('orders Hirslandenklinik findings by severity', () => {
    const findings = assembleFindings({ load, moulds })
    const levels = findings.map((f) => f.level)
    expect(levels).toEqual([...levels].sort())
    expect(findings.length).toBeGreaterThan(0)
  })

  it('prefers encoded statuses when a project has them', () => {
    const findings = assembleFindings({
      load: computeWeeklyLoad(BEETHOVENSTRASSE.rows),
      moulds: summariseMoulds(BEETHOVENSTRASSE.rows, REFERENCE_DATE),
      encodedMoulds: BEETHOVENSTRASSE.encodedMoulds,
    })
    expect(findings.some((f) => f.id.startsWith('form-'))).toBe(true)
  })

  it('does not fabricate derived findings for a project with no element rows', () => {
    const findings = assembleFindings({
      load: computeWeeklyLoad(BEETHOVENSTRASSE.rows),
      moulds: summariseMoulds(BEETHOVENSTRASSE.rows, REFERENCE_DATE),
      encodedMoulds: BEETHOVENSTRASSE.encodedMoulds,
    })
    expect(findings.every((f) => f.id.startsWith('form-'))).toBe(true)
    expect(findings).toHaveLength(9)
  })
})

describe('overallLevel', () => {
  it('reports Hirslandenklinik as needing action', () => {
    // NHK4 cannot finish inside its window, and six weeks plan beyond what
    // their moulds can yield — both are breaches, not warnings.
    expect(overallLevel(assembleFindings({ load, moulds }))).toBe('critical')
  })

  it('reports Beethovenstrasse as needing action', () => {
    const findings = assembleFindings({
      load: [],
      moulds: [],
      encodedMoulds: BEETHOVENSTRASSE.encodedMoulds,
    })
    expect(overallLevel(findings)).toBe('critical')
  })

  it('reports on-schedule when nothing is exposed', () => {
    expect(overallLevel([])).toBe('on-schedule')
  })
})
