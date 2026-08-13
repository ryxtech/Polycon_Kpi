import { describe, expect, it } from 'vitest'
import {
  BEETHOVENSTRASSE,
  HIRSLANDENKLINIK,
  SPECIMEN,
} from '@/data/projects'
import { assessDataQuality } from './dataQuality'

describe('the real Hirslandenklinik workbook', () => {
  const quality = assessDataQuality(HIRSLANDENKLINIK)
  const byId = new Map(quality.capabilities.map((c) => [c.id, c]))

  it('supports scope, schedule, moulds and feasibility today', () => {
    expect(byId.get('scope')?.state).toBe('available')
    expect(byId.get('schedule')?.state).toBe('available')
    expect(byId.get('moulds')?.state).toBe('available')
    expect(byId.get('feasibility')?.state).toBe('available')
  })

  it('blocks progress, priority and delivery for want of a column', () => {
    expect(byId.get('progress')?.state).toBe('blocked')
    expect(byId.get('priority')?.state).toBe('blocked')
    expect(byId.get('delivery')?.state).toBe('blocked')
  })

  it('names production progress as the next step', () => {
    // Ordering is deliberate: progress is the capability Marek asked about.
    expect(quality.nextStep?.id).toBe('progress')
  })

  it('gives every blocked capability an instruction, not just a diagnosis', () => {
    const blocked = quality.capabilities.filter((c) => c.state !== 'available')
    expect(blocked.length).toBeGreaterThan(0)
    expect(blocked.every((c) => Boolean(c.action))).toBe(true)
  })

  it('names the exact columns each capability needs', () => {
    expect(byId.get('progress')?.requires).toEqual([
      'PRODUCED (or a production flag)',
    ])
    expect(byId.get('priority')?.requires).toEqual(['PRIORITY'])
  })

  it('scores four of seven', () => {
    expect(quality.available).toBe(4)
    expect(quality.total).toBe(7)
  })
})

describe('the complete-data specimen', () => {
  const quality = assessDataQuality(SPECIMEN)
  const byId = new Map(quality.capabilities.map((c) => [c.id, c]))

  it('is flagged as a specimen and carries an explanation', () => {
    // Anything that renders a project can then label it, rather than each view
    // having to remember.
    expect(SPECIMEN.specimen).toBe(true)
    expect(SPECIMEN.specimenNote).toBeTruthy()
  })

  it('unlocks progress and priority, which the real workbook cannot', () => {
    expect(byId.get('progress')?.state).toBe('available')
    expect(byId.get('priority')?.state).toBe('available')
  })

  it('still blocks delivery, because no source carries that column', () => {
    // The specimen demonstrates what better data buys; it must not quietly
    // imply a capability nothing has been designed for yet.
    expect(byId.get('delivery')?.state).toBe('blocked')
  })

  it('keeps the same scope as the real workbook it was built from', () => {
    expect(SPECIMEN.rows).toHaveLength(HIRSLANDENKLINIK.rows.length)
    expect(SPECIMEN.rows.reduce((sum, row) => sum + row.qty, 0)).toBe(245)
  })

  it('reports a real completion figure rather than a placeholder', () => {
    const produced = SPECIMEN.rows.reduce((sum, row) => sum + (row.produced ?? 0), 0)
    expect(produced).toBeGreaterThan(0)
    expect(produced).toBeLessThan(245)
  })

  it('scores six of seven', () => {
    expect(quality.available).toBe(6)
  })
})

describe('a project documented only by a PDF form schedule', () => {
  const quality = assessDataQuality(BEETHOVENSTRASSE)

  it('reports element-level capabilities as blocked rather than as errors', () => {
    const byId = new Map(quality.capabilities.map((c) => [c.id, c]))
    expect(byId.get('schedule')?.state).toBe('blocked')
    expect(byId.get('feasibility')?.state).toBe('blocked')
  })

  it('still gives a path forward', () => {
    expect(quality.nextStep).not.toBeNull()
    expect(quality.nextStep?.action).toBeTruthy()
  })
})

describe('scoring', () => {
  it('rises as a source gains columns', () => {
    // The whole purpose of the view: adding a column visibly moves the score.
    expect(assessDataQuality(SPECIMEN).score).toBeGreaterThan(
      assessDataQuality(HIRSLANDENKLINIK).score,
    )
    expect(assessDataQuality(HIRSLANDENKLINIK).score).toBeGreaterThan(
      assessDataQuality(BEETHOVENSTRASSE).score,
    )
  })

  it('never reports a score outside 0 to 1', () => {
    for (const project of [HIRSLANDENKLINIK, BEETHOVENSTRASSE, SPECIMEN]) {
      const { score } = assessDataQuality(project)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(1)
    }
  })
})
