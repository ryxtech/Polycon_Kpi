/** A production week, disambiguated by year so timelines order correctly. */
export interface WeekRef {
  week: number
  year: number
}

/**
 * `MOLD WILL BE DONE` is not a date column. In the Hirslandenklinik file 81 of
 * 107 rows carry the literal string "READY TO SPRAY"; the remainder carry a
 * date. Modelling it as a union stops the parser from coercing one into the
 * other.
 */
export type MouldAvailability =
  | { kind: 'ready' }
  | { kind: 'date'; date: Date }
  | { kind: 'unknown' }

/** One row of the overview sheet, normalised. */
export interface ProductionRow {
  /** e.g. "SL-300 FP 31" */
  item: string
  /** Pieces required for this item. */
  qty: number
  /** Installation call-off group. */
  callOff: number | null
  /** e.g. "NHK7". Null when the sheet gives no mould. */
  mould: string | null
  /** When the mould becomes available. */
  availability: MouldAvailability
  /** Every week this item is scheduled in, in timeline order. */
  weeks: WeekRef[]
  /** Raw `PRODUCTION (WEEK)` text, kept for the raw-data view. */
  weeksRaw: string
  /**
   * Pieces completed. Null when the sheet carries no production flag — which
   * is the case today, and why progress renders as a placeholder.
   */
  produced: number | null
  /**
   * Production priority, 1 being most urgent. Null when the source carries no
   * priority column, which is the case for the Hirslandenklinik workbook.
   */
  priority: number | null
}

export type PriorityKey = 'critical' | 'high' | 'normal' | 'none'

/** Per-mould rollup across all rows using that mould. */
export interface MouldSummary {
  name: string
  /**
   * Distinct products using this mould. Sums to the project's unique-item
   * count across all moulds.
   */
  itemCount: number
  /**
   * Scheduled entries for this mould. Higher than `itemCount` when a product
   * is called off more than once, and sums to the sheet's row count.
   */
  scheduledRows: number
  totalQty: number
  availability: MouldAvailability
  /** First and last production week across every item using this mould. */
  firstWeek: WeekRef | null
  lastWeek: WeekRef | null
  /** Calendar days between availability and the first production week start. */
  bufferDays: number | null
  /**
   * Pieces already produced. Null when the source records no completion, in
   * which case the schedule is assessed on the full quantity as a worst case
   * and every surface says so.
   */
  producedPieces: number | null
  /** Still to make: `totalQty - producedPieces`, or the full quantity if unknown. */
  remainingPieces: number
  /**
   * Working days the remaining pieces need, at one piece per mould per day.
   * Marek's rule: 13 planned less 5 produced leaves 8, and 8 pieces is 8 days.
   */
  productionDaysRequired: number
  /**
   * Working days still available — measured from today, not from the start of
   * the window. Elapsed days cannot be spent again, which is precisely how a
   * window that looked comfortable becomes short.
   */
  availableWorkingDays: number
  /** Negative when the time left cannot hold the work left. */
  dayShortfall: number
  /** False when the remaining pieces cannot be produced in the time remaining. */
  feasible: boolean
  /** True when the window has already closed. */
  windowClosed: boolean
  status: RiskLevel
  items: string[]
}

/** Per-call-off rollup. */
export interface CallOffSummary {
  callOff: number
  itemCount: number
  totalQty: number
  produced: number | null
  firstWeek: WeekRef | null
  lastWeek: WeekRef | null
}

/** Load in a single production week. */
export interface WeekLoad {
  week: WeekRef
  /** Pieces, spread evenly across every week a row lists. */
  pieces: number
  /** Distinct moulds required in this week. */
  mouldCount: number
  moulds: string[]
  /**
   * Pieces this week's active moulds can yield, at one piece per mould per
   * working day.
   */
  pieceCapacity: number
  /** Share of that capacity the week's demand consumes. */
  utilisation: number
  /** Demand exceeds the week's capacity outright. */
  overCapacity: boolean
  /** Within capacity, but with no headroom for slippage. */
  tightCapacity: boolean
}

export type RiskLevel = 'on-schedule' | 'limited-buffer' | 'critical'

export type RiskCategory = 'capacity' | 'mould-readiness' | 'load-balance'

export interface RiskFinding {
  id: string
  level: RiskLevel
  category: RiskCategory
  title: string
  detail: string
  /** Weeks or moulds the finding refers to, for cross-highlighting. */
  refs: string[]
}

/** Headline figures for a project. */
export interface ProjectKpis {
  totalPieces: number
  uniqueItems: number
  mouldCount: number
  callOffCount: number
  /** Null until the source carries a production flag. */
  producedPieces: number | null
  /** Null until `producedPieces` is known. */
  completionRatio: number | null
  nextProductionWeek: WeekRef | null
  firstWeek: WeekRef | null
  lastWeek: WeekRef | null
  mouldsReady: number
  mouldsPending: number
}

/**
 * A project the dashboard can display. Hirslandenklinik is parsed from the
 * workbook; Beethovenstrasse is encoded from the published PDF schedules,
 * which is why its rows are optional.
 */
export interface Project {
  id: string
  name: string
  client: string
  /** Where the figures come from, shown to the user rather than implied. */
  source: string
  /** Date the underlying document was last updated. */
  dataAsOf: string
  rows: ProductionRow[]
  /**
   * Forms encoded directly from a published form schedule, used when there is
   * no workbook to derive them from.
   */
  encodedMoulds?: EncodedMould[]
  /**
   * Marks a demonstration dataset rather than a real job.
   *
   * Carried on the project itself so every surface that renders a project can
   * label it, rather than relying on each view to remember.
   */
  specimen?: boolean
  /** Shown beside the specimen badge to say what it is for. */
  specimenNote?: string
}

/**
 * A form row transcribed from a published form-production schedule, where the
 * status was already determined by Polycon's own planning.
 */
export interface EncodedMould {
  name: string
  priority: number | null
  productCount: number
  totalQty: number
  status: RiskLevel
  /** Working days by which the form misses its required date, when late. */
  lateByWorkingDays: number | null
  products: string[]
}
