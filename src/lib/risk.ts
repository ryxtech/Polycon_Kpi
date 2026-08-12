import { PROCESS, WEEKLY_FORM_DAY_CAPACITY } from '@/config/process'
import { STATUS_LABEL } from '@/config/theme'
import type {
  EncodedMould,
  MouldSummary,
  RiskFinding,
  RiskLevel,
  WeekLoad,
} from '@/types/domain'
import { pluralise, toWorkingDaysLabel } from './format'
import { formatWeek } from './weeks'

/**
 * Severity order for sorting: the thing that needs action comes first.
 */
const LEVEL_RANK: Record<RiskLevel, number> = {
  critical: 0,
  'limited-buffer': 1,
  'on-schedule': 2,
}

/**
 * Weeks that need more moulds concurrently than the plant can run.
 *
 * This is the finding the spreadsheet cannot produce on its own: it requires
 * crossing MOLD DESIGNATION with PRODUCTION (WEEK) against the stated capacity
 * of 3 forms simultaneously per day, a constant that lives in the form
 * schedule rather than the workbook.
 */
export function findCapacityConflicts(load: WeekLoad[]): RiskFinding[] {
  return load
    .filter((week) => week.overCapacity || week.tightCapacity)
    .map((week) => ({
      id: `capacity-${week.week.year}-${week.week.week}`,
      level: (week.overCapacity ? 'critical' : 'limited-buffer') as RiskLevel,
      category: 'capacity' as const,
      title: week.overCapacity
        ? `${formatWeek(week.week)} exceeds form capacity`
        : `${formatWeek(week.week)} has no capacity headroom`,
      detail: `${week.mouldCount} moulds (${week.moulds.join(', ')}) need ${week.formDaysRequired} of the ${WEEKLY_FORM_DAY_CAPACITY} form-days a week provides at ${PROCESS.formsPerDay} forms per day — ${Math.round(week.utilisation * 100)}% utilisation.`,
      refs: [formatWeek(week.week), ...week.moulds],
    }))
}

/**
 * Moulds whose buffer does not comfortably cover inspection, plus a single
 * reassurance line when everything is within its window.
 *
 * The reassurance matters: on the Hirslandenklinik data every mould is green,
 * and a panel that renders nothing reads as broken rather than as good news.
 */
export function findMouldRisks(moulds: MouldSummary[]): RiskFinding[] {
  const exposed = moulds
    .filter((mould) => mould.status !== 'on-schedule')
    .sort((a, b) => LEVEL_RANK[a.status] - LEVEL_RANK[b.status])
    .map((mould) => ({
      id: `mould-${mould.name}`,
      level: mould.status,
      category: 'mould-readiness' as const,
      title: `${mould.name} — ${STATUS_LABEL[mould.status].toLowerCase()}`,
      detail:
        mould.bufferDays === null
          ? `No readiness date recorded for ${mould.name}.`
          : mould.bufferDays <= 0
            ? `Available ${toWorkingDaysLabel(Math.abs(mould.bufferDays))} after production is due to start.`
            : `Only ${toWorkingDaysLabel(mould.bufferDays)} between availability and the start of production.`,
      refs: [mould.name],
    }))

  if (exposed.length > 0) return exposed

  const tightest = moulds
    .filter((mould) => mould.bufferDays !== null)
    .sort((a, b) => (a.bufferDays ?? 0) - (b.bufferDays ?? 0))[0]

  if (!tightest) return []

  return [
    {
      id: 'mould-all-clear',
      level: 'on-schedule',
      category: 'mould-readiness',
      title: `All ${moulds.length} moulds within their production window`,
      detail: `Tightest buffer is ${tightest.name} at ${toWorkingDaysLabel(tightest.bufferDays ?? 0)}.`,
      refs: moulds.map((mould) => mould.name),
    },
  ]
}

/**
 * Front-loading: a sustained peak followed by a long thin tail.
 *
 * Flagged when the busiest half of the schedule carries more than twice the
 * average load of the quieter half, which on this project separates the
 * 16-23 pcs/week run from the 3-8 pcs/week tail.
 */
export function findLoadImbalance(load: WeekLoad[]): RiskFinding[] {
  if (load.length < 6) return []

  const midpoint = Math.floor(load.length / 2)
  const head = load.slice(0, midpoint)
  const tail = load.slice(midpoint)

  const average = (weeks: WeekLoad[]) =>
    weeks.reduce((sum, week) => sum + week.pieces, 0) / weeks.length

  const headAverage = average(head)
  const tailAverage = average(tail)
  if (tailAverage === 0 || headAverage < tailAverage * 2) return []

  const peak = load.reduce((max, week) => (week.pieces > max.pieces ? week : max))

  return [
    {
      id: 'load-imbalance',
      level: 'limited-buffer',
      category: 'load-balance',
      title: 'Production load is front-loaded',
      detail: `Weeks ${formatWeek(head[0].week)}–${formatWeek(head[head.length - 1].week)} average ${headAverage.toFixed(1)} pcs/week, peaking at ${peak.pieces} in ${formatWeek(peak.week)}, against ${tailAverage.toFixed(1)} pcs/week thereafter.`,
      refs: [formatWeek(peak.week)],
    },
  ]
}

/**
 * Findings for a project whose forms were transcribed from a published form
 * schedule, where Polycon's own planning already determined each status.
 */
export function findEncodedMouldRisks(moulds: EncodedMould[]): RiskFinding[] {
  return moulds
    .filter((mould) => mould.status !== 'on-schedule')
    .sort((a, b) => {
      const rank = LEVEL_RANK[a.status] - LEVEL_RANK[b.status]
      return rank !== 0 ? rank : (b.lateByWorkingDays ?? 0) - (a.lateByWorkingDays ?? 0)
    })
    .map((mould) => ({
      id: `form-${mould.name}`,
      level: mould.status,
      category: 'mould-readiness' as const,
      title:
        mould.status === 'critical'
          ? `${mould.name} will not be ready on time`
          : `${mould.name} — limited buffer for inspection`,
      detail:
        mould.lateByWorkingDays !== null
          ? `Late by ${pluralise(mould.lateByWorkingDays, 'working day')}. ${pluralise(mould.productCount, 'product')}, ${mould.totalQty} pcs affected.`
          : `Inspection buffer is tight. ${pluralise(mould.productCount, 'product')}, ${mould.totalQty} pcs affected.`,
      refs: [mould.name],
    }))
}

/** All findings for a project, most severe first. */
export function assembleFindings(input: {
  load: WeekLoad[]
  moulds: MouldSummary[]
  encodedMoulds?: EncodedMould[]
}): RiskFinding[] {
  const findings = input.encodedMoulds?.length
    ? [...findEncodedMouldRisks(input.encodedMoulds), ...findCapacityConflicts(input.load)]
    : [
        ...findCapacityConflicts(input.load),
        ...findLoadImbalance(input.load),
        ...findMouldRisks(input.moulds),
      ]

  return findings.sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level])
}

/** Highest severity present, for a project-level status badge. */
export function overallLevel(findings: RiskFinding[]): RiskLevel {
  if (findings.some((f) => f.level === 'critical')) return 'critical'
  if (findings.some((f) => f.level === 'limited-buffer')) return 'limited-buffer'
  return 'on-schedule'
}
