import { describe, expect, it } from 'vitest'
import { BEETHOVENSTRASSE, HIRSLANDENKLINIK, REFERENCE_DATE } from '@/data/projects'
import { computeWeeklyLoad, summariseMoulds } from './derive'
import {
  assembleFindings,
  findCapacityConflicts,
  findEncodedMouldRisks,
  findLoadImbalance,
  findMouldRisks,
  overallLevel,
} from './risk'

const rows = HIRSLANDENKLINIK.rows
const load = computeWeeklyLoad(rows)
const moulds = summariseMoulds(rows, REFERENCE_DATE)

describe('findCapacityConflicts', () => {
  const conflicts = findCapacityConflicts(load)

  it('flags exactly the two weeks with no headroom', () => {
    // Six moulds x 2 form-days = 12 of the 15 a week provides: 80% utilisation,
    // above the tight threshold but not a breach. Weeks needing four or five
    // moulds sit at 53% and 67% and are correctly left alone.
    expect(conflicts.map((f) => f.title)).toEqual([
      'W37 has no capacity headroom',
      'W43 has no capacity headroom',
    ])
  })

  it('shows the arithmetic so the claim can be checked', () => {
    expect(conflicts[0].detail).toContain('6 moulds')
    expect(conflicts[0].detail).toContain('12 of the 15 form-days')
    expect(conflicts[0].detail).toContain('80% utilisation')
  })

  it('rates a tight week as needing attention, not action', () => {
    expect(conflicts.every((f) => f.level === 'limited-buffer')).toBe(true)
  })

  it('escalates to critical when demand exceeds capacity outright', () => {
    const breached = [
      {
        ...load[0],
        mouldCount: 9,
        moulds: Array.from({ length: 9 }, (_, i) => `NHK${i + 1}`),
        formDaysRequired: 18,
        utilisation: 18 / 15,
        overCapacity: true,
        tightCapacity: false,
      },
    ]
    const findings = findCapacityConflicts(breached)
    expect(findings[0].level).toBe('critical')
    expect(findings[0].title).toContain('exceeds form capacity')
  })

  it('produces nothing when every week has headroom', () => {
    const within = load.map((week) => ({
      ...week,
      mouldCount: 2,
      moulds: ['NHK1', 'NHK2'],
      formDaysRequired: 4,
      utilisation: 4 / 15,
      overCapacity: false,
      tightCapacity: false,
    }))
    expect(findCapacityConflicts(within)).toEqual([])
  })
})

describe('findMouldRisks', () => {
  it('reports reassurance rather than nothing when all moulds are clear', () => {
    // An empty panel reads as broken; the tightest buffer is the useful fact.
    const findings = findMouldRisks(moulds)
    expect(findings).toHaveLength(1)
    expect(findings[0].level).toBe('on-schedule')
    expect(findings[0].title).toContain('All 10 moulds')
    expect(findings[0].detail).toContain('NHK3')
  })

  it('surfaces a mould that cannot be ready in time', () => {
    const exposed = moulds.map((mould, index) =>
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
  it('reports Hirslandenklinik as needing attention but not action', () => {
    expect(overallLevel(assembleFindings({ load, moulds }))).toBe('limited-buffer')
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
