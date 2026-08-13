import { CAPACITY, PIECES_PER_MOULD_PER_WEEK, PROCESS, RISK } from '@/config/process'
import type {
  CallOffSummary,
  EncodedMould,
  MouldSummary,
  ProductionRow,
  ProjectKpis,
  RiskLevel,
  WeekLoad,
  WeekRef,
} from '@/types/domain'
import {
  compareWeeks,
  daysBetween,
  earliestWeek,
  latestWeek,
  weekEndDate,
  weekSortKey,
  weekStartDate,
  workingDaysBetween,
} from './weeks'

/**
 * Classify a mould's schedule exposure from its buffer in calendar days.
 *
 * The bands come from `config/process.ts` and mirror the three states Polycon
 * already use in their own form schedules.
 */
export function classifyBuffer(bufferDays: number | null): RiskLevel {
  if (bufferDays === null) return 'limited-buffer'
  if (bufferDays <= RISK.criticalBufferDays) return 'critical'
  if (bufferDays <= RISK.limitedBufferDays) return 'limited-buffer'
  return 'on-schedule'
}

/**
 * Total pieces, unique items, moulds and call-offs.
 *
 * `producedPieces` stays null unless the source carried a production flag.
 * Nothing here invents a completion figure — the workbook has no such column,
 * so the UI shows a placeholder rather than a number nobody can defend.
 */
export function computeKpis(
  rows: ProductionRow[],
  referenceDate: Date,
  encodedMoulds?: EncodedMould[],
): ProjectKpis {
  // A project with no element rows still has a published form schedule. Its
  // totals come from there rather than showing zeroes.
  if (rows.length === 0 && encodedMoulds && encodedMoulds.length > 0) {
    return kpisFromForms(encodedMoulds)
  }

  const allWeeks = rows.flatMap((row) => row.weeks)
  const moulds = new Set(rows.map((row) => row.mould).filter((m): m is string => m !== null))
  const callOffs = new Set(
    rows.map((row) => row.callOff).filter((c): c is number => c !== null),
  )

  const anyProduced = rows.some((row) => row.produced !== null)
  const producedPieces = anyProduced
    ? rows.reduce((sum, row) => sum + (row.produced ?? 0), 0)
    : null

  const totalPieces = rows.reduce((sum, row) => sum + row.qty, 0)

  const mouldSummaries = summariseMoulds(rows, referenceDate)

  return {
    totalPieces,
    uniqueItems: new Set(rows.map((row) => row.item)).size,
    mouldCount: moulds.size,
    callOffCount: callOffs.size,
    producedPieces,
    completionRatio:
      producedPieces === null || totalPieces === 0
        ? null
        : producedPieces / totalPieces,
    nextProductionWeek: findNextWeek(allWeeks, referenceDate),
    firstWeek: earliestWeek(allWeeks),
    lastWeek: latestWeek(allWeeks),
    mouldsReady: mouldSummaries.filter((m) => m.availability.kind === 'ready').length,
    mouldsPending: mouldSummaries.filter((m) => m.availability.kind !== 'ready').length,
  }
}

/**
 * Headline figures taken straight from a published form schedule.
 *
 * "Ready" means the form is on schedule, which is the only readiness signal
 * such a document carries — there are no per-mould availability dates to
 * measure a buffer against, so none is invented.
 */
function kpisFromForms(forms: EncodedMould[]): ProjectKpis {
  const ready = forms.filter((form) => form.status === 'on-schedule').length

  return {
    totalPieces: forms.reduce((sum, form) => sum + form.totalQty, 0),
    uniqueItems: forms.reduce((sum, form) => sum + form.productCount, 0),
    mouldCount: forms.length,
    callOffCount: 0,
    producedPieces: null,
    completionRatio: null,
    nextProductionWeek: null,
    firstWeek: null,
    lastWeek: null,
    mouldsReady: ready,
    mouldsPending: forms.length - ready,
  }
}

/** The first scheduled week that has not already started. */
export function findNextWeek(weeks: WeekRef[], referenceDate: Date): WeekRef | null {
  const upcoming = weeks
    .filter((week) => weekStartDate(week).getTime() >= referenceDate.getTime())
    .sort(compareWeeks)
  return upcoming[0] ?? earliestWeek(weeks)
}

/**
 * Roll rows up per mould and compute each mould's buffer.
 *
 * Buffer is the gap between a mould becoming available and the start of the
 * first week its items are due. A mould already "READY TO SPRAY" is measured
 * from the reference date instead, since it is available now.
 */
export function summariseMoulds(
  rows: ProductionRow[],
  referenceDate: Date,
): MouldSummary[] {
  const groups = new Map<string, ProductionRow[]>()

  for (const row of rows) {
    if (!row.mould) continue
    const existing = groups.get(row.mould)
    if (existing) existing.push(row)
    else groups.set(row.mould, [row])
  }

  const summaries: MouldSummary[] = []

  for (const [name, mouldRows] of groups) {
    const weeks = mouldRows.flatMap((row) => row.weeks)
    const firstWeek = earliestWeek(weeks)
    const lastWeek = latestWeek(weeks)

    // Every row for a mould repeats the same availability; take the first known.
    const availability =
      mouldRows.find((row) => row.availability.kind !== 'unknown')?.availability ??
      ({ kind: 'unknown' } as const)

    let bufferDays: number | null = null
    if (firstWeek) {
      const productionStart = weekStartDate(firstWeek)
      if (availability.kind === 'date') {
        bufferDays = daysBetween(availability.date, productionStart)
      } else if (availability.kind === 'ready') {
        bufferDays = daysBetween(referenceDate, productionStart)
      }
    }

    const totalQty = mouldRows.reduce((sum, row) => sum + row.qty, 0)

    /*
     * Marek's rule, applied to what is actually left:
     *
     *   "if 13 pcs are planned and 5 are already produced, then just 8 remain
     *    … production follows 1 pc / 1 mould / 1 day"
     *
     * So QTY is the original 13, produced is the 5, and the schedule risk is
     * 8 days of work against the working days still remaining in the window —
     * measured from today, because elapsed days cannot be spent again. A
     * window with 5 days left and 8 days of work is 3 days short, and that
     * shortfall is the thing worth putting in front of a production manager.
     */
    const anyProduced = mouldRows.some((row) => row.produced !== null)
    const producedPieces = anyProduced
      ? mouldRows.reduce((sum, row) => sum + (row.produced ?? 0), 0)
      : null
    const remainingPieces = Math.max(totalQty - (producedPieces ?? 0), 0)

    const productionDaysRequired = Math.ceil(
      remainingPieces / PROCESS.piecesPerMouldPerDay,
    )

    // Count from today when production has already started, otherwise from the
    // window's own opening — a future window has not begun losing days yet.
    const windowStart = firstWeek ? weekStartDate(firstWeek) : null
    const windowEnd = lastWeek ? weekEndDate(lastWeek) : null
    const countFrom =
      windowStart && referenceDate.getTime() > windowStart.getTime()
        ? referenceDate
        : windowStart

    const availableWorkingDays =
      countFrom && windowEnd ? workingDaysBetween(countFrom, windowEnd) : 0
    const windowClosed = Boolean(
      windowEnd && referenceDate.getTime() > windowEnd.getTime(),
    )

    const dayShortfall = availableWorkingDays - productionDaysRequired
    const feasible =
      remainingPieces === 0 || (!windowClosed && dayShortfall >= 0)

    summaries.push({
      name,
      itemCount: new Set(mouldRows.map((row) => row.item)).size,
      scheduledRows: mouldRows.length,
      totalQty,
      availability,
      firstWeek,
      lastWeek,
      bufferDays,
      producedPieces,
      remainingPieces,
      productionDaysRequired,
      availableWorkingDays,
      dayShortfall,
      feasible,
      windowClosed,
      // A window that cannot hold the work is the more severe fact, so it
      // outranks the mould-readiness buffer when the two disagree.
      status: !feasible ? 'critical' : classifyBuffer(bufferDays),
      items: [...new Set(mouldRows.map((row) => row.item))].sort(),
    })
  }

  return summaries.sort(byMouldName)
}

/** "NHK2" before "NHK10" — numeric suffixes sorted as numbers. */
function byMouldName(a: MouldSummary, b: MouldSummary): number {
  const parse = (name: string) => {
    const match = name.match(/^([A-Z]+)(\d+)$/)
    return match ? { prefix: match[1], index: Number.parseInt(match[2], 10) } : null
  }
  const pa = parse(a.name)
  const pb = parse(b.name)
  if (pa && pb && pa.prefix === pb.prefix) return pa.index - pb.index
  return a.name.localeCompare(b.name)
}

export function summariseCallOffs(rows: ProductionRow[]): CallOffSummary[] {
  const groups = new Map<number, ProductionRow[]>()

  for (const row of rows) {
    if (row.callOff === null) continue
    const existing = groups.get(row.callOff)
    if (existing) existing.push(row)
    else groups.set(row.callOff, [row])
  }

  return [...groups.entries()]
    .map(([callOff, callOffRows]) => {
      const weeks = callOffRows.flatMap((row) => row.weeks)
      const anyProduced = callOffRows.some((row) => row.produced !== null)

      return {
        callOff,
        itemCount: new Set(callOffRows.map((row) => row.item)).size,
        totalQty: callOffRows.reduce((sum, row) => sum + row.qty, 0),
        produced: anyProduced
          ? callOffRows.reduce((sum, row) => sum + (row.produced ?? 0), 0)
          : null,
        firstWeek: earliestWeek(weeks),
        lastWeek: latestWeek(weeks),
      }
    })
    .sort((a, b) => a.callOff - b.callOff)
}

/**
 * Weekly production load.
 *
 * A row that lists several weeks carries no per-week split, so its quantity is
 * spread evenly across them. This is an approximation and the UI labels it as
 * one. Mould counts are exact — a mould is either needed in a week or not.
 */
export function computeWeeklyLoad(rows: ProductionRow[]): WeekLoad[] {
  const buckets = new Map<number, { week: WeekRef; pieces: number; moulds: Set<string> }>()

  for (const row of rows) {
    if (row.weeks.length === 0) continue
    const share = row.qty / row.weeks.length

    for (const week of row.weeks) {
      const key = weekSortKey(week)
      let bucket = buckets.get(key)
      if (!bucket) {
        bucket = { week, pieces: 0, moulds: new Set<string>() }
        buckets.set(key, bucket)
      }
      bucket.pieces += share
      if (row.mould) bucket.moulds.add(row.mould)
    }
  }

  return [...buckets.values()]
    .map((bucket) => {
      /*
       * A week's ceiling is set by how many moulds are running in it, not by
       * the form-manufacturing limit: each active mould yields one piece per
       * working day, so `moulds x 5` pieces is the most the week can deliver.
       */
      const pieceCapacity = bucket.moulds.size * PIECES_PER_MOULD_PER_WEEK
      const utilisation = pieceCapacity === 0 ? 0 : bucket.pieces / pieceCapacity

      return {
        week: bucket.week,
        // Left unrounded so weekly figures still sum to the project total;
        // rounding is a presentation concern and happens at render.
        pieces: bucket.pieces,
        mouldCount: bucket.moulds.size,
        moulds: [...bucket.moulds].sort(),
        pieceCapacity,
        utilisation,
        overCapacity: utilisation > 1,
        tightCapacity: utilisation >= CAPACITY.tightUtilisation && utilisation <= 1,
      }
    })
    .sort((a, b) => compareWeeks(a.week, b.week))
}
