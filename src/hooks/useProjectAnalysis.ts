import { useMemo } from 'react'
import { REFERENCE_DATE } from '@/data/projects'
import {
  computeKpis,
  computeWeeklyLoad,
  summariseCallOffs,
  summariseMoulds,
} from '@/lib/derive'
import { assembleFindings, overallLevel, summariseFindings } from '@/lib/risk'
import type {
  CallOffSummary,
  ProductionRow,
  MouldSummary,
  Project,
  ProjectKpis,
  RiskFinding,
  RiskLevel,
  WeekLoad,
} from '@/types/domain'

export interface ProjectAnalysis {
  kpis: ProjectKpis
  moulds: MouldSummary[]
  callOffs: CallOffSummary[]
  load: WeekLoad[]
  findings: RiskFinding[]
  level: RiskLevel
  /** One line saying why the project carries that level. */
  reason: string
}

/**
 * Every derived figure for a project, computed once per project change.
 *
 * All of it comes from `lib/`, which holds no React and is covered by tests —
 * components render these values and never compute their own.
 */
export function useProjectAnalysis(project: Project): ProjectAnalysis {
  return useMemo(() => analyseProject(project), [project])
}

export function analyseProject(project: Project): ProjectAnalysis {
  return analyseRows(project.rows, project)
}

/**
 * Analyse an arbitrary subset of a project's rows.
 *
 * Cross-filtering runs the selected rows through this same function, so a
 * filtered figure is produced by exactly the pipeline that produced the
 * headline it came from — the two can never quietly disagree.
 */
export function analyseRows(
  rows: ProductionRow[],
  project: Project,
): ProjectAnalysis {
  const kpis = computeKpis(rows, REFERENCE_DATE, project.encodedMoulds)
  const moulds = summariseMoulds(rows, REFERENCE_DATE)
  const callOffs = summariseCallOffs(rows)
  const load = computeWeeklyLoad(rows)
  const findings = assembleFindings({
    load,
    moulds,
    encodedMoulds: project.encodedMoulds,
  })

  return {
    kpis,
    moulds,
    callOffs,
    load,
    findings,
    level: overallLevel(findings),
    reason: summariseFindings(findings),
  }
}
