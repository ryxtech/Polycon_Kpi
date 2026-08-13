import type { Project } from '@/types/domain'

/**
 * What the product can do, and what each capability costs in source data.
 *
 * The point of this module is to answer a question the client actually has and
 * the dashboard otherwise leaves unanswered: *what do we have to change in the
 * spreadsheet to get the rest of this?* Every capability names the column it
 * needs and what appears when that column exists, so the path forward is a
 * short list rather than a conversation.
 */
export type CapabilityId =
  | 'scope'
  | 'schedule'
  | 'moulds'
  | 'feasibility'
  | 'progress'
  | 'priority'
  | 'delivery'

export type CapabilityState = 'available' | 'partial' | 'blocked'

export interface Capability {
  id: CapabilityId
  label: string
  /** What the client gets when this is available. */
  unlocks: string
  /** Source columns it depends on, in the client's own vocabulary. */
  requires: string[]
  state: CapabilityState
  /** Present only when not fully available: what to do about it. */
  action?: string
}

export interface DataQuality {
  capabilities: Capability[]
  available: number
  total: number
  /** 0–1. Shown as a figure, never as a grade. */
  score: number
  /** The single most valuable next change, or null when nothing is missing. */
  nextStep: Capability | null
}

/** Share of rows carrying a usable value for a field. */
function coverage(project: Project, has: (row: Project['rows'][number]) => boolean) {
  if (project.rows.length === 0) return 0
  return project.rows.filter(has).length / project.rows.length
}

function stateFrom(ratio: number): CapabilityState {
  if (ratio >= 0.999) return 'available'
  if (ratio > 0) return 'partial'
  return 'blocked'
}

/**
 * Assess one project against every capability.
 *
 * Deliberately field-driven rather than project-driven: a new workbook is
 * assessed by what it contains, so the readiness view stays correct for a
 * source nobody has seen yet.
 */
export function assessDataQuality(project: Project): DataQuality {
  const hasRows = project.rows.length > 0
  const fromFormSchedule = Boolean(project.encodedMoulds?.length)

  const scopeRatio = hasRows
    ? coverage(project, (row) => row.item !== '' && row.qty > 0)
    : fromFormSchedule
      ? 1
      : 0
  const weekRatio = coverage(project, (row) => row.weeks.length > 0)
  const mouldRatio = coverage(project, (row) => row.mould !== null)
  const availabilityRatio = coverage(
    project,
    (row) => row.availability.kind !== 'unknown',
  )
  const producedRatio = coverage(project, (row) => row.produced !== null)
  const priorityRatio = coverage(project, (row) => row.priority !== null)

  const capabilities: Capability[] = [
    {
      id: 'scope',
      label: 'Project scope',
      unlocks: 'Total pieces, distinct products, moulds and call-offs',
      requires: ['ITEM', 'QTY'],
      state: stateFrom(scopeRatio),
      action:
        scopeRatio >= 0.999
          ? undefined
          : 'Every row needs an item code and a quantity.',
    },
    {
      id: 'schedule',
      label: 'Production timeline',
      unlocks: 'Week-by-week plan, load chart and the production window',
      requires: ['PRODUCTION (WEEK)'],
      state: stateFrom(weekRatio),
      action:
        weekRatio >= 0.999
          ? undefined
          : 'Fill the production week for every row; ranges like "37 + 38" are fine.',
    },
    {
      id: 'moulds',
      label: 'Mould readiness',
      unlocks: 'Per-mould rollup, readiness donut and inspection buffer',
      requires: ['MOLD DESIGNATION', 'MOLD WILL BE DONE'],
      state: stateFrom(Math.min(mouldRatio, availabilityRatio)),
      action:
        Math.min(mouldRatio, availabilityRatio) >= 0.999
          ? undefined
          : 'Give every row a mould and a readiness date or "READY TO SPRAY".',
    },
    {
      id: 'feasibility',
      label: 'Capacity and feasibility',
      unlocks:
        'Whether each mould can finish inside its window, at 1 pc/mould/day',
      requires: ['QTY', 'MOLD DESIGNATION', 'PRODUCTION (WEEK)'],
      state: stateFrom(Math.min(scopeRatio, weekRatio, mouldRatio)),
      action:
        Math.min(scopeRatio, weekRatio, mouldRatio) >= 0.999
          ? undefined
          : 'Needs quantity, mould and production week together on the same row.',
    },
    {
      id: 'progress',
      label: 'Production progress',
      unlocks: 'Percent complete, elements produced and remaining quantity',
      requires: ['PRODUCED (or a production flag)'],
      state: stateFrom(producedRatio),
      action:
        producedRatio >= 0.999
          ? undefined
          : 'Add one column recording pieces already produced. The dashboard reads PRODUCED, DONE, COMPLETED or STATUS.',
    },
    {
      id: 'priority',
      label: 'Priority',
      unlocks: 'Priority filtering and a critical-path reading of the timeline',
      requires: ['PRIORITY'],
      state: stateFrom(priorityRatio),
      action:
        priorityRatio >= 0.999
          ? undefined
          : 'Add a PRIORITY column, 1 being most urgent — the form schedule already groups this way.',
    },
    {
      id: 'delivery',
      label: 'Delivery commitment',
      unlocks: 'Required delivery dates and on-time confidence per call-off',
      requires: ['REQUIRED DELIVERY DATE'],
      // No source seen so far carries this; the production schedules plot it,
      // but the workbook has no column for it.
      state: 'blocked',
      action:
        'Add the required delivery date per call-off, as plotted in the production schedule PDF.',
    },
  ]

  const available = capabilities.filter((c) => c.state === 'available').length

  // The next step is the highest-value blocked capability, in the order they
  // are declared — scope before schedule before progress, and so on.
  const nextStep = capabilities.find((c) => c.state !== 'available') ?? null

  return {
    capabilities,
    available,
    total: capabilities.length,
    score: capabilities.length === 0 ? 0 : available / capabilities.length,
    nextStep,
  }
}
