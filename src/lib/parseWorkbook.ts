import type * as XLSXTypes from 'xlsx'
import {
  PRODUCTION_FLAG_HEADERS,
  PRODUCTION_FLAG_TRUTHY,
} from '@/config/process'
import type { MouldAvailability, ProductionRow } from '@/types/domain'
import { extractWeekNumbers, inferWrapPivot, tokeniseWeeks } from './weeks'

/**
 * A row as it leaves the spreadsheet, before normalisation:
 * [ITEM, QTY, CALL OFF, MOLD DESIGNATION, MOLD WILL BE DONE, PRODUCTION (WEEK), PRODUCED?]
 */
export type RawRow = [
  item: string,
  qty: number | null,
  callOff: number | null,
  mould: string | null,
  availability: string | null,
  weeks: string,
  produced?: number | string | null,
]

export interface ParseResult {
  rows: ProductionRow[]
  /** True when the source carried a usable production-flag column. */
  hasProductionFlag: boolean
  /** Header the flag was found under, for display. */
  productionFlagHeader: string | null
  warnings: string[]
}

const READY_TO_SPRAY = 'READY TO SPRAY'

/** Excel's epoch, offset by its deliberate 1900 leap-year bug. */
const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30)
const MS_PER_DAY = 86_400_000

/**
 * Convert an Excel serial date to a Date.
 *
 * Implemented here rather than via SheetJS's `SSF` so that the seeded datasets,
 * which run through this module at startup, do not pull the spreadsheet parser
 * into the initial bundle. Only the upload path loads it.
 */
export function excelSerialToDate(serial: number): Date | null {
  if (!Number.isFinite(serial) || serial <= 20_000 || serial >= 80_000) return null
  return new Date(EXCEL_EPOCH_UTC + Math.round(serial) * MS_PER_DAY)
}

/** Mould names are written inconsistently ("NHK 10" vs "NHK10"). */
export function normaliseMouldName(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const text = String(value).replace(/\s+/g, '').toUpperCase()
  if (!text || text === 'NA' || text === '#N/A') return null
  return text
}

/**
 * Interpret `MOLD WILL BE DONE`, which mixes a literal state with dates.
 *
 * 81 of the 107 Hirslandenklinik rows read "READY TO SPRAY"; the rest carry a
 * date. Coercing the string to a date would silently yield Invalid Date and
 * every downstream buffer would be NaN.
 */
export function parseAvailability(value: unknown): MouldAvailability {
  if (value === null || value === undefined || value === '') {
    return { kind: 'unknown' }
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { kind: 'date', date: value }
  }

  const text = String(value).trim()
  if (text.toUpperCase().replace(/\s+/g, ' ') === READY_TO_SPRAY) {
    return { kind: 'ready' }
  }

  // Excel serial date numbers survive some export paths as bare numbers.
  if (/^\d+(\.\d+)?$/.test(text)) {
    const date = excelSerialToDate(Number.parseFloat(text))
    if (date) return { kind: 'date', date }
  }

  const date = new Date(text)
  if (!Number.isNaN(date.getTime())) return { kind: 'date', date }

  return { kind: 'unknown' }
}

function parseQty(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const parsed = Number.parseFloat(String(value ?? '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

function parseCallOff(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number.parseInt(String(value), 10)
  return Number.isFinite(parsed) ? parsed : null
}

/** Does a production-flag cell mean "this element is complete"? */
export function isFlagTruthy(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value > 0
  const text = String(value).trim().toUpperCase()
  return (PRODUCTION_FLAG_TRUTHY as readonly string[]).includes(text)
}

/**
 * Turn raw rows into the domain shape.
 *
 * Shared by the seeded dataset and by uploaded workbooks so a demo can never
 * behave differently from a live import.
 */
export function normaliseRows(raw: RawRow[], baseYear: number): ProductionRow[] {
  const populated = raw.filter(
    (row) => row[0] !== null && String(row[0]).trim() !== '',
  )

  // The pivot is inferred from the schedule as a whole, so it must be decided
  // before any single row is tokenised.
  const pivotWeek = inferWrapPivot(
    populated.flatMap((row) => extractWeekNumbers(row[5])),
  )

  return populated
    .map((row) => {
      const [item, qty, callOff, mould, availability, weeks, produced] = row
      const quantity = parseQty(qty)

      return {
        item: String(item).trim(),
        qty: quantity,
        callOff: parseCallOff(callOff),
        mould: normaliseMouldName(mould),
        availability: parseAvailability(availability),
        weeks: tokeniseWeeks(weeks, baseYear, pivotWeek),
        weeksRaw: String(weeks ?? '').trim(),
        produced:
          produced === undefined || produced === null
            ? null
            : typeof produced === 'number'
              ? produced
              : isFlagTruthy(produced)
                ? quantity
                : 0,
      }
    })
}

/** Case- and whitespace-insensitive header lookup. */
function headerIndex(headers: string[], candidates: readonly string[]): number {
  const normalised = headers.map((h) => h.trim().toUpperCase().replace(/\s+/g, ' '))
  for (const candidate of candidates) {
    const index = normalised.indexOf(candidate)
    if (index !== -1) return index
  }
  return -1
}

function findHeaderStartingWith(headers: string[], prefix: string): number {
  const target = prefix.toUpperCase()
  return headers.findIndex((h) =>
    h.trim().toUpperCase().replace(/\s+/g, ' ').startsWith(target),
  )
}

/**
 * Build the item→mould map from sheet `List2`.
 *
 * `MOLD DESIGNATION` in `List1` is a VLOOKUP into this sheet. When a workbook
 * is saved without cached formula results, SheetJS returns blanks for the whole
 * column, so we resolve the lookup ourselves rather than losing every mould.
 */
export function buildMouldLookup(
  workbook: XLSXTypes.WorkBook,
  xlsx: typeof XLSXTypes,
): Map<string, string> {
  const lookup = new Map<string, string>()
  const sheetName = workbook.SheetNames.find((name) => /list ?2/i.test(name))
  if (!sheetName) return lookup

  const sheet = workbook.Sheets[sheetName]
  const grid = xlsx.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  })

  for (const row of grid) {
    if (!Array.isArray(row)) continue
    // The mapping sits in columns B and C, but tolerate a leading blank column.
    for (let col = 0; col < row.length - 1; col += 1) {
      const item = row[col]
      const mould = normaliseMouldName(row[col + 1])
      if (!item || !mould || !/^NHK|^BES/i.test(mould)) continue
      const key = String(item).trim()
      if (key) lookup.set(key, mould)
    }
  }

  return lookup
}

/**
 * Parse an uploaded workbook into domain rows.
 *
 * Header matching is tolerant: Polycon maintain these files by hand and column
 * order and spacing drift between projects.
 */
export async function parseWorkbook(
  data: ArrayBuffer,
  baseYear: number,
): Promise<ParseResult> {
  // Loaded on demand: the spreadsheet parser is the single largest dependency
  // and is only needed when someone actually imports a file.
  const xlsx = await import('xlsx')

  const workbook = xlsx.read(data, { type: 'array', cellDates: true })
  const warnings: string[] = []

  const sheetName =
    workbook.SheetNames.find((name) => /list ?1/i.test(name)) ??
    workbook.SheetNames[0]

  if (!sheetName) {
    return {
      rows: [],
      hasProductionFlag: false,
      productionFlagHeader: null,
      warnings: ['The workbook contains no sheets.'],
    }
  }

  const sheet = workbook.Sheets[sheetName]
  const grid = xlsx.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
  })

  if (grid.length < 2) {
    return {
      rows: [],
      hasProductionFlag: false,
      productionFlagHeader: null,
      warnings: [`Sheet "${sheetName}" has no data rows.`],
    }
  }

  const headers = (grid[0] ?? []).map((h) => String(h ?? ''))

  const itemCol = headerIndex(headers, ['ITEM', 'ELEMENT', 'PRODUCT'])
  const qtyCol = headerIndex(headers, ['QTY', 'QUANTITY', 'PCS', 'PIECES'])
  const callOffCol = headerIndex(headers, ['CALL OFF', 'CALL-OFF', 'CALLOFF'])
  const mouldCol =
    headerIndex(headers, ['MOLD DESIGNATION', 'MOULD DESIGNATION', 'MOLD', 'MOULD', 'FORM']) !== -1
      ? headerIndex(headers, ['MOLD DESIGNATION', 'MOULD DESIGNATION', 'MOLD', 'MOULD', 'FORM'])
      : findHeaderStartingWith(headers, 'MOLD')
  const availabilityCol =
    headerIndex(headers, ['MOLD WILL BE DONE', 'MOULD WILL BE DONE']) !== -1
      ? headerIndex(headers, ['MOLD WILL BE DONE', 'MOULD WILL BE DONE'])
      : findHeaderStartingWith(headers, 'MOLD WILL')
  const weeksCol =
    headerIndex(headers, ['PRODUCTION (WEEK)', 'PRODUCTION WEEK', 'WEEK', 'WEEKS']) !== -1
      ? headerIndex(headers, ['PRODUCTION (WEEK)', 'PRODUCTION WEEK', 'WEEK', 'WEEKS'])
      : findHeaderStartingWith(headers, 'PRODUCTION')
  const flagCol = headerIndex(headers, PRODUCTION_FLAG_HEADERS)

  if (itemCol === -1) {
    return {
      rows: [],
      hasProductionFlag: false,
      productionFlagHeader: null,
      warnings: [
        `Could not find an ITEM column in sheet "${sheetName}". Found: ${headers.filter(Boolean).join(', ')}`,
      ],
    }
  }

  if (mouldCol === -1) warnings.push('No mould column found — mould views will be empty.')
  if (weeksCol === -1) warnings.push('No production week column found — the timeline will be empty.')

  const mouldLookup = buildMouldLookup(workbook, xlsx)
  let resolvedByLookup = 0

  const rawRows: RawRow[] = []

  for (let r = 1; r < grid.length; r += 1) {
    const row = grid[r]
    if (!Array.isArray(row)) continue

    const item = itemCol === -1 ? null : row[itemCol]
    if (item === null || item === undefined || String(item).trim() === '') continue

    const itemName = String(item).trim()
    let mould = mouldCol === -1 ? null : normaliseMouldName(row[mouldCol])

    // VLOOKUP formulas without cached results arrive blank or as "#N/A".
    if (!mould && mouldLookup.has(itemName)) {
      mould = mouldLookup.get(itemName) ?? null
      resolvedByLookup += 1
    }

    rawRows.push([
      itemName,
      qtyCol === -1 ? null : (row[qtyCol] as number | null),
      callOffCol === -1 ? null : (row[callOffCol] as number | null),
      mould,
      availabilityCol === -1 ? null : (row[availabilityCol] as string | null),
      weeksCol === -1 ? '' : String(row[weeksCol] ?? ''),
      flagCol === -1 ? null : (row[flagCol] as string | null),
    ])
  }

  if (resolvedByLookup > 0) {
    warnings.push(
      `Resolved ${resolvedByLookup} mould assignment${resolvedByLookup === 1 ? '' : 's'} from sheet List2 because the workbook had no cached formula results.`,
    )
  }

  return {
    rows: normaliseRows(rawRows, baseYear),
    hasProductionFlag: flagCol !== -1,
    productionFlagHeader: flagCol === -1 ? null : headers[flagCol],
    warnings,
  }
}
