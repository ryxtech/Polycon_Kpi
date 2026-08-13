import type { RawRow } from '@/lib/parseWorkbook'

/**
 * SPECIMEN DATASET — not a Polycon project.
 *
 * The product is only as good as the spreadsheet behind it, and Polycon's
 * current workbook cannot yet answer "how much is done" or "what is urgent".
 * Showing the dashboard against that workbook alone makes the gap look like a
 * limitation of the product rather than of the source.
 *
 * So this specimen carries the *same columns in the same shape*, plus the two
 * the real file is missing — a produced quantity and a priority. It exists to
 * show what the same dashboard does once those columns exist, and it is
 * labelled as a specimen everywhere it appears so it can never be mistaken for
 * a real job.
 *
 * Structure, item codes, moulds, call-offs and production weeks are taken from
 * the real Hirslandenklinik workbook. Only the two added columns are
 * constructed, and they are constructed deterministically: 78%,
 * 45%, 20% and 0% of each call-off
 * respectively, so the story stays coherent rather than looking scattered.
 *
 * Columns: ITEM, QTY, CALL OFF, MOLD DESIGNATION, MOLD WILL BE DONE,
 * PRODUCTION (WEEK), PRODUCED, PRIORITY.
 */
export const SPECIMEN_RAW_ROWS: RawRow[] = [
  ["SL-300 BP 01", 3, 1, "NHK10", "2026-08-13", "37", 2, 1],
  ["SL-300 BP 02", 6, 1, "NHK3", "2026-08-28", "37 + 38", 4, 1],
  ["SL-300 BP 03", 1, 1, "NHK3", "2026-08-28", "38", 0, 1],
  ["SL-300 BP 04", 1, 1, "NHK1", "2026-08-20", "41", 0, 1],
  ["SL-300 BP 08", 1, 1, "NHK1", "2026-08-20", "41", 0, 1],
  ["SL-300 BP 09", 2, 1, "NHK1", "2026-08-20", "41", 1, 1],
  ["SL-300 BP 10", 1, 1, "NHK1", "2026-08-20", "41", 0, 1],
  ["SL-300 BP 13", 2, 1, "NHK3", "2026-08-28", "38 + 39", 1, 1],
  ["SL-300 DR 01", 3, 1, "NHK2", "2026-08-20", "42", 2, 1],
  ["SL-300 DR 02", 1, 1, "NHK2", "2026-08-20", "43", 0, 1],
  ["SL-300 DR 03", 1, 1, "NHK2", "2026-08-20", "43", 0, 1],
  ["SL-300 DR 04", 1, 1, "NHK2", "2026-08-20", "43", 0, 1],
  ["SL-300 DR 12", 1, 1, "NHK8", "2026-08-27", "43", 0, 1],
  ["SL-300 DR FP 20", 3, 1, "NHK7", "READY TO SPRAY", "35", 2, 1],
  ["SL-300 DR FP 21", 1, 1, "NHK7", "READY TO SPRAY", "35", 0, 1],
  ["SL-300 DR FP 22", 1, 1, "NHK7", "READY TO SPRAY", "35", 0, 1],
  ["SL-300 DR FP 23", 1, 1, "NHK7", "READY TO SPRAY", "36", 0, 1],
  ["SL-300 DR FP 28", 1, 1, "NHK9", "2026-09-01", "43", 0, 1],
  ["SL-300 EP 01", 1, 1, "NHK5", "READY TO SPRAY", "35", 0, 1],
  ["SL-300 EP 02", 1, 1, "NHK5", "READY TO SPRAY", "35", 0, 1],
  ["SL-300 EP 03", 1, 1, "NHK5", "READY TO SPRAY", "35", 0, 1],
  ["SL-300 EP 04", 2, 1, "NHK5", "READY TO SPRAY", "35", 1, 1],
  ["SL-300 FP 10", 1, 1, "NHK7", "READY TO SPRAY", "36", 0, 1],
  ["SL-300 FP 11", 2, 1, "NHK6", "READY TO SPRAY", "35", 1, 1],
  ["SL-300 FP 12", 1, 1, "NHK6", "READY TO SPRAY", "35", 0, 1],
  ["SL-300 FP 13", 1, 1, "NHK6", "READY TO SPRAY", "35", 0, 1],
  ["SL-300 FP 14", 1, 1, "NHK7", "READY TO SPRAY", "36", 0, 1],
  ["SL-300 FP 15", 3, 1, "NHK6", "READY TO SPRAY", "35 + 36", 2, 1],
  ["SL-300 FP 16", 1, 1, "NHK6", "READY TO SPRAY", "36", 0, 1],
  ["SL-300 FP 17", 1, 1, "NHK7", "READY TO SPRAY", "36", 0, 1],
  ["SL-300 FP 18", 3, 1, "NHK6", "READY TO SPRAY", "36 + 37", 2, 1],
  ["SL-300 FP 19", 1, 1, "NHK6", "READY TO SPRAY", "37", 0, 1],
  ["SL-300 FP 20", 1, 1, "NHK7", "READY TO SPRAY", "36", 0, 1],
  ["SL-300 FP 21", 3, 1, "NHK6", "READY TO SPRAY", "37", 2, 1],
  ["SL-300 FP 22", 1, 1, "NHK6", "READY TO SPRAY", "38", 0, 1],
  ["SL-300 FP 23", 1, 1, "NHK7", "READY TO SPRAY", "37", 0, 1],
  ["SL-300 FP 24", 3, 1, "NHK6", "READY TO SPRAY", "38", 2, 1],
  ["SL-300 FP 25", 1, 1, "NHK6", "READY TO SPRAY", "38", 0, 1],
  ["SL-300 FP AD 01", 6, 1, "NHK4", "READY TO SPRAY", "35 + 36", 4, 1],
  ["SL-300 FP AD 02", 6, 1, "NHK4", "READY TO SPRAY", "36", 4, 1],
  ["SL-300 FP AD 03", 6, 1, "NHK4", "READY TO SPRAY", "37 + 38", 4, 1],
  ["SL-300 FP AD 04", 12, 1, "NHK4", "READY TO SPRAY", "38 + 39 + 40", 9, 1],
  ["SL-300 LP 01", 1, 1, "NHK4", "READY TO SPRAY", "40", 0, 1],
  ["SL-300 LP 02", 1, 1, "NHK5", "READY TO SPRAY", "36", 0, 1],
  ["SL-300 LP 03", 1, 1, "NHK4", "READY TO SPRAY", "40", 0, 1],
  ["SL-300 LP 04", 1, 1, "NHK5", "READY TO SPRAY", "36", 0, 1],
  ["SL-300 LP 05", 1, 1, "NHK4", "READY TO SPRAY", "41", 0, 1],
  ["SL-300 LP 06", 1, 1, "NHK5", "READY TO SPRAY", "36", 0, 1],
  ["SL-300 LP 07", 2, 1, "NHK4", "READY TO SPRAY", "41", 1, 1],
  ["SL-300 LP 08", 2, 1, "NHK5", "READY TO SPRAY", "36", 1, 1],
  ["SL-300 FP 30", 2, 2, "NHK7", "READY TO SPRAY", "37", 0, 2],
  ["SL-300 FP 31", 8, 2, "NHK7", "READY TO SPRAY", "37 + 38 + 39", 3, 2],
  ["SL-300 FP 32", 1, 2, "NHK7", "READY TO SPRAY", "39", 0, 2],
  ["SL-300 FP 33", 1, 2, "NHK7", "READY TO SPRAY", "39", 0, 2],
  ["SL-300 FP 34", 1, 2, "NHK7", "READY TO SPRAY", "39", 0, 2],
  ["SL-300 FP 35", 2, 2, "NHK7", "READY TO SPRAY", "39 + 40", 0, 2],
  ["SL-300 FP 36", 2, 2, "NHK7", "READY TO SPRAY", "40", 0, 2],
  ["SL-300 FP 37", 13, 2, "NHK7", "READY TO SPRAY", "40 + 41+ 42 + 43", 5, 2],
  ["SL-300 FP 38", 2, 2, "NHK7", "READY TO SPRAY", "43", 0, 2],
  ["SL-300 FP 39", 13, 2, "NHK7", "READY TO SPRAY", "44 +45 +46 + 47", 5, 2],
  ["SL-300 DR 05", 1, 3, "NHK2", "2026-08-20", "43", 0, 4],
  ["SL-300 DR 06", 3, 3, "NHK2", "2026-08-20", "44", 0, 4],
  ["SL-300 DR 07", 1, 3, "NHK2", "2026-08-20", "43", 0, 4],
  ["SL-300 DR FP 24", 2, 3, "NHK7", "READY TO SPRAY", "47", 0, 4],
  ["SL-300 DR FP 25", 3, 3, "NHK7", "READY TO SPRAY", "47 - 48", 0, 4],
  ["SL-300 FP 40", 2, 3, "NHK7", "READY TO SPRAY", "48", 0, 4],
  ["SL-300 FP 41", 13, 3, "NHK7", "READY TO SPRAY", "48 + 49 + 50 + 51", 2, 4],
  ["SL-300 FP 42", 2, 3, "NHK7", "READY TO SPRAY", "51", 0, 4],
  ["SL-300 FP 43", 13, 3, "NHK7", "READY TO SPRAY", "52 + 53 + 1 + 2", 2, 4],
  ["SL-300 BP 05", 1, 4, "NHK1", "2026-08-20", "42", 0, 5],
  ["SL-300 BP 06", 3, 4, "NHK3", "2026-08-28", "39", 0, 5],
  ["SL-300 BP 07", 3, 4, "NHK3", "2026-08-28", "39 + 40", 0, 5],
  ["SL-300 BP 11", 1, 4, "NHK1", "2026-08-20", "42", 0, 5],
  ["SL-300 BP 12", 1, 4, "NHK3", "2026-08-28", "40", 0, 5],
  ["SL-300 DR 08", 1, 4, "NHK2", "2026-08-20", "44", 0, 5],
  ["SL-300 DR 09", 1, 4, "NHK2", "2026-08-20", "44", 0, 5],
  ["SL-300 DR 10", 1, 4, "NHK2", "2026-08-20", "45", 0, 5],
  ["SL-300 DR 11", 1, 4, "NHK2", "2026-08-20", "45", 0, 5],
  ["SL-300 DR FP 22", 1, 4, "NHK7", "READY TO SPRAY", "2", 0, 5],
  ["SL-300 DR FP 23", 1, 4, "NHK7", "READY TO SPRAY", "2", 0, 5],
  ["SL-300 DR FP 26", 1, 4, "NHK7", "READY TO SPRAY", "2", 0, 5],
  ["SL-300 DR FP 27", 1, 4, "NHK7", "READY TO SPRAY", "2", 0, 5],
  ["SL-300 FP 11", 3, 4, "NHK6", "READY TO SPRAY", "39", 0, 5],
  ["SL-300 FP 13", 1, 4, "NHK6", "READY TO SPRAY", "39", 0, 5],
  ["SL-300 FP 14", 1, 4, "NHK7", "READY TO SPRAY", "3", 0, 5],
  ["SL-300 FP 15", 3, 4, "NHK6", "READY TO SPRAY", "39 + 40", 0, 5],
  ["SL-300 FP 16", 1, 4, "NHK6", "READY TO SPRAY", "40", 0, 5],
  ["SL-300 FP 17", 1, 4, "NHK7", "READY TO SPRAY", "3", 0, 5],
  ["SL-300 FP 18", 3, 4, "NHK6", "READY TO SPRAY", "40 + 41", 0, 5],
  ["SL-300 FP 19", 1, 4, "NHK6", "READY TO SPRAY", "41", 0, 5],
  ["SL-300 FP 20", 1, 4, "NHK7", "READY TO SPRAY", "3", 0, 5],
  ["SL-300 FP 21", 3, 4, "NHK6", "READY TO SPRAY", "41 + 42", 0, 5],
  ["SL-300 FP 22", 1, 4, "NHK6", "READY TO SPRAY", "42", 0, 5],
  ["SL-300 FP 23", 1, 4, "NHK7", "READY TO SPRAY", "3", 0, 5],
  ["SL-300 FP 24", 3, 4, "NHK6", "READY TO SPRAY", "42 + 43", 0, 5],
  ["SL-300 FP 25", 1, 4, "NHK6", "READY TO SPRAY", "43", 0, 5],
  ["SL-300 FP 50", 1, 4, "NHK7", "READY TO SPRAY", "3", 0, 5],
  ["SL-300 FP 60", 1, 4, "NHK7", "READY TO SPRAY", "4", 0, 5],
  ["SL-300 FP 61", 1, 4, "NHK7", "READY TO SPRAY", "4", 0, 5],
  ["SL-300 FP 62", 2, 4, "NHK7", "READY TO SPRAY", "4", 0, 5],
  ["SL-300 FP AD 02", 2, 4, "NHK4", "READY TO SPRAY", "41", 0, 5],
  ["SL-300 FP AD 03", 2, 4, "NHK4", "READY TO SPRAY", "42", 0, 5],
  ["SL-300 FP AD 04", 4, 4, "NHK4", "READY TO SPRAY", "42 + 43", 0, 5],
  ["SL-300 FP AD 65", 1, 4, "NHK4", "READY TO SPRAY", "43", 0, 5],
  ["SL-300 FP AD 66", 1, 4, "NHK4", "READY TO SPRAY", "43", 0, 5],
  ["SL-300 FP AD 67", 2, 4, "NHK4", "READY TO SPRAY", "43", 0, 5],
  ["SL-300 LP 60", 1, 4, "NHK5", "READY TO SPRAY", "37", 0, 5],
]

export const SPECIMEN_BASE_YEAR = 2026
export const SPECIMEN_DATA_AS_OF = '11 Aug 2026'

/** Verified against the generated rows: 62 produced of 245 planned. */
export const SPECIMEN_TOTALS = { planned: 245, produced: 62 } as const
