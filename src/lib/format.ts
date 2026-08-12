import { PROCESS } from '@/config/process'
import type { MouldAvailability } from '@/types/domain'
import { formatDate } from './weeks'

/** Calendar days converted to working days at the configured week length. */
export function toWorkingDays(calendarDays: number): number {
  return Math.max(0, Math.round((calendarDays / 7) * PROCESS.workingDaysPerWeek))
}

/**
 * Buffers are described in working days because that is how Polycon's own form
 * schedule quantifies them ("by 3 working days").
 */
export function toWorkingDaysLabel(calendarDays: number): string {
  const days = toWorkingDays(calendarDays)
  return `${days} working day${days === 1 ? '' : 's'}`
}

export function pluralise(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`
}

export function formatAvailability(availability: MouldAvailability): string {
  switch (availability.kind) {
    case 'ready':
      return 'Ready to spray'
    case 'date':
      return formatDate(availability.date)
    case 'unknown':
      return 'Not recorded'
  }
}

/** Whole number when whole, one decimal otherwise. Avoids "20.0 pcs". */
export function formatPieces(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export function formatPercent(ratio: number | null): string {
  return ratio === null ? '—' : `${Math.round(ratio * 100)}%`
}
