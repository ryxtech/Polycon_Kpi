import { CALENDAR } from '@/config/process'
import type { WeekRef } from '@/types/domain'

const MS_PER_DAY = 86_400_000

/**
 * Assign a calendar year to a bare week number.
 *
 * Hirslandenklinik runs weeks 35..53 of the base year and then wraps into 1..4
 * of the next; without this, sorting places week 2 before week 35 and every
 * timeline reads backwards. Beethovenstrasse runs weeks 12..22 and does not
 * wrap at all, so the pivot cannot be a fixed constant — see `inferWrapPivot`.
 *
 * A pivot of 0 disables wrapping: every week belongs to the base year.
 */
export function resolveWeekYear(
  week: number,
  baseYear: number,
  pivotWeek: number = CALENDAR.yearWrapPivotWeek,
): number {
  if (pivotWeek <= 0) return baseYear
  return week >= pivotWeek ? baseYear : baseYear + 1
}

/**
 * Decide whether a schedule wraps the year boundary, from the weeks it uses.
 *
 * A schedule that contains both late-year and early-year weeks has wrapped;
 * one that sits entirely in the middle of the year has not. Inferring this
 * rather than configuring it means an uploaded workbook for an unknown project
 * orders correctly without anyone setting a flag.
 */
export function inferWrapPivot(weekNumbers: number[]): number {
  if (weekNumbers.length === 0) return 0
  const hasLateWeeks = weekNumbers.some((w) => w >= CALENDAR.wrapDetectionLateWeek)
  const hasEarlyWeeks = weekNumbers.some((w) => w <= CALENDAR.wrapDetectionEarlyWeek)
  return hasLateWeeks && hasEarlyWeeks ? CALENDAR.yearWrapPivotWeek : 0
}

/** Every integer in a cell that could be a week number. */
export function extractWeekNumbers(raw: unknown): number[] {
  if (raw === null || raw === undefined) return []
  const matches = String(raw).match(/\d+/g)
  if (!matches) return []
  return matches
    .map((m) => Number.parseInt(m, 10))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 53)
}

/**
 * Extract week references from a `PRODUCTION (WEEK)` cell.
 *
 * The column is hand-maintained and inconsistent. All of these appear in the
 * Hirslandenklinik file and must yield the same shape:
 *
 *   "37"                    "37 + 38"           "47 - 48"
 *   "40 + 41+ 42 + 43"      "44 +45 +46 + 47"   "52 + 53 + 1 + 2"
 *
 * Separators are ignored entirely; every integer run is a week. Results are
 * de-duplicated and returned in timeline order.
 */
export function tokeniseWeeks(
  raw: unknown,
  baseYear: number,
  pivotWeek: number = CALENDAR.yearWrapPivotWeek,
): WeekRef[] {
  const seen = new Set<number>()
  const weeks: WeekRef[] = []

  for (const week of extractWeekNumbers(raw)) {
    if (seen.has(week)) continue
    seen.add(week)
    weeks.push({ week, year: resolveWeekYear(week, baseYear, pivotWeek) })
  }

  return weeks.sort(compareWeeks)
}

/** Sortable scalar for a week. */
export function weekSortKey(ref: WeekRef): number {
  return ref.year * 100 + ref.week
}

export function compareWeeks(a: WeekRef, b: WeekRef): number {
  return weekSortKey(a) - weekSortKey(b)
}

export function sameWeek(a: WeekRef, b: WeekRef): boolean {
  return a.week === b.week && a.year === b.year
}

/** Monday of the given ISO week. */
export function weekStartDate(ref: WeekRef): Date {
  const jan4 = new Date(Date.UTC(ref.year, 0, 4))
  const jan4Weekday = (jan4.getUTCDay() + 6) % 7
  const firstMonday = jan4.getTime() - jan4Weekday * MS_PER_DAY
  return new Date(firstMonday + (ref.week - 1) * 7 * MS_PER_DAY)
}

/** Sunday of the given ISO week. */
export function weekEndDate(ref: WeekRef): Date {
  return new Date(weekStartDate(ref).getTime() + 6 * MS_PER_DAY)
}

/** Whole calendar days between two dates, `to - from`. */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY)
}

/**
 * Working days from `from` up to and including `to`, Monday–Friday.
 *
 * Used to measure the time a mould *actually has left*, not the size of its
 * original window: days already elapsed cannot be spent again, so a window
 * that looked comfortable in August may be short by October.
 */
export function workingDaysBetween(from: Date, to: Date): number {
  if (to.getTime() < from.getTime()) return 0

  let count = 0
  const cursor = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
  )
  const end = to.getTime()
  let guard = 0

  while (cursor.getTime() <= end && guard < 4000) {
    const day = cursor.getUTCDay()
    if (day !== 0 && day !== 6) count += 1
    cursor.setUTCDate(cursor.getUTCDate() + 1)
    guard += 1
  }

  return count
}

export function formatWeek(ref: WeekRef): string {
  return `W${ref.week}`
}

/** "W37 · 7 Sep 2026" */
export function formatWeekLong(ref: WeekRef): string {
  return `${formatWeek(ref)} · ${formatDate(weekStartDate(ref))}`
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * Every week from `first` to `last` inclusive, including weeks nothing is
 * scheduled in — a Gantt with gaps collapsed misrepresents the timeline.
 */
export function weekRange(first: WeekRef, last: WeekRef): WeekRef[] {
  const out: WeekRef[] = []
  let cursor = { ...first }
  let guard = 0

  while (weekSortKey(cursor) <= weekSortKey(last) && guard < 200) {
    out.push({ ...cursor })
    cursor = nextWeek(cursor)
    guard += 1
  }

  return out
}

export function nextWeek(ref: WeekRef): WeekRef {
  const weeksInYear = isoWeeksInYear(ref.year)
  return ref.week >= weeksInYear
    ? { week: 1, year: ref.year + 1 }
    : { week: ref.week + 1, year: ref.year }
}

/** ISO-8601 years have 52 weeks, or 53 when they start or end on a Thursday. */
export function isoWeeksInYear(year: number): number {
  const dec28 = new Date(Date.UTC(year, 11, 28))
  const dayOfWeek = (dec28.getUTCDay() + 6) % 7
  const thursday = new Date(dec28.getTime() + (3 - dayOfWeek) * MS_PER_DAY)
  const jan1 = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1))
  return Math.ceil(((thursday.getTime() - jan1.getTime()) / MS_PER_DAY + 1) / 7)
}

/** Earliest week in a list, or null when empty. */
export function earliestWeek(weeks: WeekRef[]): WeekRef | null {
  if (weeks.length === 0) return null
  return weeks.reduce((min, w) => (weekSortKey(w) < weekSortKey(min) ? w : min))
}

/** Latest week in a list, or null when empty. */
export function latestWeek(weeks: WeekRef[]): WeekRef | null {
  if (weeks.length === 0) return null
  return weeks.reduce((max, w) => (weekSortKey(w) > weekSortKey(max) ? w : max))
}
