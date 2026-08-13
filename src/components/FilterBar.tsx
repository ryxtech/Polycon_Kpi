import { GRADIENT, PALETTE } from '@/config/theme'
import { describeFilter, type CrossFilter } from '@/lib/crossFilter'
import { IconClose } from './icons'

interface FilterBarProps {
  filter: CrossFilter
  /** Entries and pieces inside the selection, against the unfiltered totals. */
  entries: number
  totalEntries: number
  pieces: number
  totalPieces: number
  onClear: () => void
}

/**
 * States the active selection and what it costs.
 *
 * Without this the reader sees every figure on the canvas change and has no way
 * to know why — a filtered number with no visible cause is worse than no filter
 * at all. The counts are shown as "n of total" so the selection's size relative
 * to the project is legible at a glance.
 */
export function FilterBar({
  filter,
  entries,
  totalEntries,
  pieces,
  totalPieces,
  onClear,
}: FilterBarProps) {
  const { dimension, value } = describeFilter(filter)

  return (
    <div
      role="status"
      aria-live="polite"
      className="card rise flex-row flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
    >
      <span
        className="chip px-3 py-1 text-[13px] font-semibold text-white"
        style={{ background: GRADIENT.brand }}
      >
        {dimension} {value}
      </span>

      <p className="text-[13px] text-(--color-ink-muted)">
        Showing{' '}
        <span className="num font-semibold text-(--color-ink)">{entries}</span> of{' '}
        <span className="num">{totalEntries}</span> entries ·{' '}
        <span className="num font-semibold text-(--color-ink)">{pieces}</span> of{' '}
        <span className="num">{totalPieces}</span> pieces
      </p>

      <button
        type="button"
        onClick={onClear}
        className="ml-auto flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl bg-(--color-surface-sunken) px-3.5 text-[13px] font-medium text-(--color-ink-muted) transition-colors hover:text-(--color-ink)"
      >
        <IconClose size={15} />
        Clear filter
      </button>

      <p className="w-full text-[11px] text-(--color-ink-faint)">
        Every visual below reflects this selection. Press{' '}
        <kbd
          className="rounded px-1 py-0.5 text-[10px]"
          style={{ background: PALETTE.surfaceSunken }}
        >
          Esc
        </kbd>{' '}
        or click the same mark again to clear.
      </p>
    </div>
  )
}
