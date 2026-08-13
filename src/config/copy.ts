/**
 * Wording that must stay identical wherever it appears, and that carries a
 * commercial commitment rather than only a UI label.
 */
export const COPY = {
  /**
   * Shown against every progress figure the source cannot yet support.
   *
   * Polycon's Warren Street report derives completion from a production flag in
   * the overview schedule; the Hirslandenklinik workbook has no such column, so
   * the figure is named as outstanding rather than estimated.
   */
  completionPending:
    'Completed quantity will be calculated from the production status information in the updated Excel.',

  /** The product reports a snapshot. It does not claim a live connection. */
  dataCurrencyPrefix: 'Data current as of',

  /**
   * Says plainly what would make the figures move. Without it "data current
   * as of" invites the reader to assume a schedule that does not exist.
   */
  nextRefresh: 'Next refresh: when the latest Excel is uploaded',

  spreadCaveat:
    'Rows spanning several weeks have their quantity spread evenly; the source gives no per-week split.',

  footer: 'POLYCON · CLIENT REPORTING',
} as const

/**
 * One-line explanations for the headline figures, each naming the Excel
 * columns it is read from.
 *
 * Naming the columns is the point. It keeps visible that this is Polycon's own
 * spreadsheet being reported back rather than a separate system with its own
 * numbers — which is the positioning the whole product rests on.
 */
export const KPI_HELP = {
  overallProduction: {
    what: 'Share of ordered pieces finished.',
    columns: ['QTY', 'PRODUCED'],
    missing: true,
  },
  elementsProduced: {
    what: 'Finished pieces against total ordered.',
    columns: ['QTY', 'PRODUCED'],
    missing: true,
  },
  mouldsReady: {
    what: 'Moulds finished and able to produce.',
    columns: ['MOLD DESIGNATION', 'MOLD WILL BE DONE'],
  },
  nextProduction: {
    what: 'Next week with production scheduled.',
    columns: ['PRODUCTION (WEEK)'],
  },
  openFindings: {
    what: 'Moulds or weeks that cannot deliver as planned.',
    columns: ['QTY', 'MOLD DESIGNATION', 'PRODUCTION (WEEK)'],
  },
  productionProgress: {
    what: 'Ordered, made, and still to make. One piece per mould per day, so pieces left = days left.',
    columns: ['QTY', 'PRODUCED'],
    missing: true,
  },
  daysNeeded: {
    what: 'One working day per remaining piece.',
    columns: ['QTY', 'PRODUCED', 'PRODUCTION (WEEK)'],
  },
} as const
