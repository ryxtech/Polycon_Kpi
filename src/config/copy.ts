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

  spreadCaveat:
    'Rows spanning several weeks have their quantity spread evenly; the source gives no per-week split.',

  footer: 'POLYCON · CLIENT REPORTING',
} as const
