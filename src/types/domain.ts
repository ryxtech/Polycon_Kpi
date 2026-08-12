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
}

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
  /** Form-days demanded: moulds x production duration. */
  formDaysRequired: number
  /** Share of the week's form-day capacity consumed. */
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
