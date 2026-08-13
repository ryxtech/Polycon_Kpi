/**
 * Manufacturing process constants.
 *
 * Source: Beethovenstrasse_form_schedule_EN.pdf header and legend —
 * "production capacity: 3 forms simultaneously / day",
 * "material preparation (1 day)", "form production (2 days)".
 *
 * Nothing in the application hardcodes these values; every derivation and
 * every label reads them from here.
 */
/**
 * Manufacturing constants.
 *
 * Two distinct processes, and conflating them is the easiest mistake to make
 * here: `formsPerDay`, `materialPreparationDays` and `formProductionDays`
 * describe *building a mould*, and come from the form-production schedule PDF.
 * `piecesPerMouldPerDay` describes *using* one, and comes from Marek directly:
 *
 *   "production of these 8 pcs follow up in continual production
 *    1 pc / 1 mold / 1 day … if there is required 13 pcs then production
 *    will follow 13 working consecutive days"
 */
export const PROCESS = {
  /** Moulds that can be *manufactured* simultaneously on any given day. */
  formsPerDay: 3,
  /** Days of material preparation before a form enters production. */
  materialPreparationDays: 1,
  /** Days a form spends being manufactured. */
  formProductionDays: 2,
  /**
   * Elements one finished mould yields per working day.
   *
   * The single most consequential number in the model: it turns a quantity
   * directly into a duration, so N pieces on a mould is N working days on that
   * mould, and a mould's schedule is feasible only if its window holds them.
   */
  piecesPerMouldPerDay: 1,
  /** Working days per calendar week. */
  workingDaysPerWeek: 5,
} as const

/**
 * Weekly capacity for *manufacturing* moulds, in form-days.
 * Retained for the form schedule; it is not the element-production limit.
 */
export const WEEKLY_FORM_DAY_CAPACITY =
  PROCESS.formsPerDay * PROCESS.workingDaysPerWeek

/** Pieces one mould can yield in a full working week. */
export const PIECES_PER_MOULD_PER_WEEK =
  PROCESS.piecesPerMouldPerDay * PROCESS.workingDaysPerWeek

export const CAPACITY = {
  /**
   * Utilisation at or above which a week has no meaningful headroom. Below a
   * full breach, but tight enough that any slippage cascades.
   */
  tightUtilisation: 0.85,
} as const

/**
 * Thresholds that classify a mould's schedule exposure.
 *
 * `buffer` is the number of calendar days between a mould becoming available
 * and the start of the first week its items are scheduled for production.
 * Negative means the mould is not ready in time.
 *
 * The three bands mirror the states Polycon already uses in their own form
 * schedule: on schedule / limited buffer for inspection / will not be ready.
 */
export const RISK = {
  /** At or below this buffer the mould cannot be ready in time. */
  criticalBufferDays: 0,
  /**
   * At or below this buffer, inspection time is not comfortably covered.
   *
   * Set to one calendar week — five working days — which is the scale Polycon's
   * own form schedule works at, where lateness is reported as "by 1 working
   * day" through "by 5 working days". A wider band would mark moulds amber that
   * have over a fortnight of slack, and an Attention panel that cries wolf gets
   * ignored.
   */
  limitedBufferDays: 7,
} as const

/**
 * Production weeks wrap the calendar year: this project runs weeks 35..53 of
 * 2026 and then 1..4 of 2027. Any week number below the pivot is treated as
 * belonging to the following year, which keeps timeline ordering correct.
 */
export const CALENDAR = {
  /** When wrapping applies, weeks below this number belong to `baseYear + 1`. */
  yearWrapPivotWeek: 30,
  /** A schedule containing a week at or above this is running late in the year. */
  wrapDetectionLateWeek: 40,
  /** ...and one at or below this is running early. Both present means it wrapped. */
  wrapDetectionEarlyWeek: 10,
} as const

/** Column headers carrying a production priority, if the source has one. */
export const PRIORITY_HEADERS = [
  'PRIORITY',
  'PRIO',
  'PRIO.',
  'PRIORITA',
  'PRIORITÄT',
] as const

/**
 * Priority bands.
 *
 * The brief asks for 1-5 filtering shown as Critical / High / Normal. Polycon's
 * own form schedule groups by "PRIORITY 1", "PRIORITY 4", "PRIORITY 5" and
 * "NO PRIORITY", so 1 is the most urgent and unassigned is the least.
 */
export const PRIORITY_BANDS = [
  { max: 1, key: 'critical', label: 'Critical' },
  { max: 3, key: 'high', label: 'High' },
  { max: 99, key: 'normal', label: 'Normal' },
] as const

/** Column headers that, if present, mark an element as produced. */
export const PRODUCTION_FLAG_HEADERS = [
  'PRODUCED',
  'DONE',
  'COMPLETED',
  'COMPLETE',
  'STATUS',
  'PRODUCTION STATUS',
  'READY',
] as const

/** Cell values within a production-flag column that count as completed. */
export const PRODUCTION_FLAG_TRUTHY = [
  'X',
  'YES',
  'Y',
  'TRUE',
  '1',
  'DONE',
  'PRODUCED',
  'COMPLETE',
  'COMPLETED',
  'OK',
] as const
