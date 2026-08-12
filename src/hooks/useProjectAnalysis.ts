import { useMemo } from 'react'
import { REFERENCE_DATE } from '@/data/projects'
import {
  computeKpis,
  computeWeeklyLoad,
  summariseCallOffs,
  summariseMoulds,
} from '@/lib/derive'
import { assembleFindings, overallLevel } from '@/lib/risk'
import type {
  CallOffSummary,
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
  const kpis = computeKpis(project.rows, REFERENCE_DATE, project.encodedMoulds)
  const moulds = summariseMoulds(project.rows, REFERENCE_DATE)
  const callOffs = summariseCallOffs(project.rows)
  const load = computeWeeklyLoad(project.rows)
  const findings = assembleFindings({
    load,
    moulds,
    encodedMoulds: project.encodedMoulds,
  })

  return { kpis, moulds, callOffs, load, findings, level: overallLevel(findings) }
}
