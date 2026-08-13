import { PROCESS } from '@/config/process'
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
 * Weeks demanding more pieces than their active moulds can yield.
 *
 * This is the finding the spreadsheet cannot make on its own: it crosses
 * MOLD DESIGNATION with PRODUCTION (WEEK) and QTY against the production rate
 * Marek stated — one piece per mould per working day — so a week's ceiling is
 * `moulds x 5` pieces regardless of how much is planned into it.
 */
export function findCapacityConflicts(load: WeekLoad[]): RiskFinding[] {
  return load
    .filter((week) => week.overCapacity || week.tightCapacity)
    .map((week) => {
      const demand = Math.round(week.pieces * 10) / 10
      const shortfall = Math.round((week.pieces - week.pieceCapacity) * 10) / 10

      return {
        id: `capacity-${week.week.year}-${week.week.week}`,
        level: (week.overCapacity ? 'critical' : 'limited-buffer') as RiskLevel,
        category: 'capacity' as const,
        title: week.overCapacity
          ? `${formatWeek(week.week)} plans more than its moulds can produce`
          : `${formatWeek(week.week)} has no production headroom`,
        detail: week.overCapacity
          ? `${demand} pcs planned against a ceiling of ${week.pieceCapacity} — ${week.mouldCount} ${week.mouldCount === 1 ? 'mould' : 'moulds'} (${week.moulds.join(', ')}) at ${PROCESS.piecesPerMouldPerDay} pc/mould/day over ${PROCESS.workingDaysPerWeek} working days. Short by ${shortfall} pcs.`
          : `${demand} of the ${week.pieceCapacity} pcs ${week.mouldCount} ${week.mouldCount === 1 ? 'mould' : 'moulds'} can yield (${week.moulds.join(', ')}) — ${Math.round(week.utilisation * 100)}% of capacity.`,
        refs: [formatWeek(week.week), ...week.moulds],
      }
    })
}

/**
 * Moulds whose quantity cannot fit the window they are scheduled in.
 *
 * At one piece per mould per working day a quantity *is* a duration, so this
 * compares a mould's pieces against the working days its window contains. It
 * is the most actionable finding the product makes: the schedule as written
 * cannot be delivered, and the shortfall is stated in days.
 */
export function findInfeasibleMoulds(moulds: MouldSummary[]): RiskFinding[] {
  return moulds
    .filter((mould) => !mould.feasible)
    .sort((a, b) => a.dayShortfall - b.dayShortfall)
    .map((mould) => {
      const short = Math.abs(mould.dayShortfall)
      // Say what is left, and where the figure came from — a shortfall the
      // reader cannot trace back to the sheet is a shortfall they will argue
      // with rather than act on.
      const basis =
        mould.producedPieces === null
          ? `${mould.remainingPieces} pcs outstanding (no completion recorded, so the full quantity is assumed)`
          : `${mould.remainingPieces} pcs left of ${mould.totalQty} — ${mould.producedPieces} already produced`

      return {
        id: `infeasible-${mould.name}`,
        level: 'critical' as RiskLevel,
        category: 'capacity' as const,
        title: mould.windowClosed
          ? `${mould.name} has work outstanding past its window`
          : `${mould.name} cannot finish in the time left`,
        detail: mould.windowClosed
          ? `${basis}, but ${formatWeek(mould.lastWeek!)} has already passed.`
          : `${basis}. At ${PROCESS.piecesPerMouldPerDay} pc/mould/day that needs ${pluralise(mould.productionDaysRequired, 'working day')}, and only ${pluralise(mould.availableWorkingDays, 'working day')} remain before ${formatWeek(mould.lastWeek!)} ends. Short by ${pluralise(short, 'day')}.`,
        refs: [mould.name],
      }
    })
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
        ...findInfeasibleMoulds(input.moulds),
        ...findCapacityConflicts(input.load),
        ...findLoadImbalance(input.load),
        ...findMouldRisks(input.moulds),
      ]

  return findings.sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level])
}

/**
 * One line saying why a project carries the status it does.
 *
 * A badge reading "Action required" on all three projects tells a reader
 * nothing about which to open first. This counts the findings by kind so the
 * portfolio can say *what* is wrong, not merely *that* something is.
 */
export function summariseFindings(findings: RiskFinding[]): string {
  const open = findings.filter((f) => f.level !== 'on-schedule')
  if (open.length === 0) {
    return findings.length > 0 ? 'All moulds within their window' : 'Nothing outstanding'
  }

  const infeasible = open.filter((f) => f.id.startsWith('infeasible-')).length
  const overCapacity = open.filter(
    (f) => f.category === 'capacity' && f.level === 'critical' && !f.id.startsWith('infeasible-'),
  ).length
  const tight = open.filter(
    (f) => f.category === 'capacity' && f.level === 'limited-buffer',
  ).length
  const lateForms = open.filter((f) => f.id.startsWith('form-')).length
  const readiness = open.filter(
    (f) => f.category === 'mould-readiness' && !f.id.startsWith('form-'),
  ).length

  const parts: string[] = []
  if (infeasible > 0) {
    parts.push(`${infeasible} ${infeasible === 1 ? 'mould' : 'moulds'} cannot finish in window`)
  }
  if (lateForms > 0) parts.push(`${lateForms} forms late`)
  if (overCapacity > 0) {
    parts.push(`${overCapacity} ${overCapacity === 1 ? 'week' : 'weeks'} over capacity`)
  }
  if (readiness > 0) parts.push(`${readiness} mould readiness`)
  if (parts.length === 0 && tight > 0) {
    parts.push(`${tight} ${tight === 1 ? 'week' : 'weeks'} with no headroom`)
  }

  // Two clauses is the most a card can carry without wrapping badly.
  return parts.slice(0, 2).join(' · ')
}

/** Highest severity present, for a project-level status badge. */
export function overallLevel(findings: RiskFinding[]): RiskLevel {
  if (findings.some((f) => f.level === 'critical')) return 'critical'
  if (findings.some((f) => f.level === 'limited-buffer')) return 'limited-buffer'
  return 'on-schedule'
}
