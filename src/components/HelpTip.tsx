import { useEffect, useRef, useState } from 'react'
import { PALETTE } from '@/config/theme'

interface HelpTipProps {
  /** One short line: what the figure means. */
  what: string
  /**
   * The Excel columns it is read from.
   *
   * Naming them is the point: it makes visible that this is their spreadsheet
   * being reported back, not a separate system holding its own numbers.
   */
  columns: readonly string[]
  /** Shown when the columns are not in the file yet. */
  missing?: boolean
  label: string
}

/**
 * One-line explanation attached to a figure, with the Excel columns behind it.
 *
 * Deliberately short. A tooltip long enough to need reading is a tooltip nobody
 * reads — one sentence and the source columns is what a client or a production
 * manager actually wants when a label is unfamiliar.
 *
 * Opens on click rather than hover so it works on a touch screen on the floor.
 */
export function HelpTip({ what, columns, missing = false, label }: HelpTipProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return

    const onDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span ref={wrapRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        aria-label={`What does ${label} mean?`}
        className="grid h-5 w-5 cursor-pointer place-items-center rounded-full text-[11px] font-bold transition-colors"
        style={{
          backgroundColor: open ? PALETTE.primary : PALETTE.surfaceSunken,
          color: open ? '#fff' : PALETTE.inkFaint,
        }}
      >
        ?
      </button>

      {open && (
        <span
          role="tooltip"
          /* Centred on the trigger and width-clamped: right-anchored, it ran
             off the viewport on the leftmost tile. */
          className="absolute top-7 left-1/2 z-30 w-56 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl bg-(--color-surface) p-3 text-left font-normal normal-case shadow-[var(--shadow-float)]"
        >
          <span className="block text-xs leading-snug text-(--color-ink)">
            {what}
          </span>

          <span className="mt-2 block border-t border-(--color-gridline) pt-2">
            <span className="block text-[10px] tracking-normal text-(--color-ink-faint)">
              {missing ? 'Needs this Excel column' : 'From your Excel'}
            </span>
            <span className="mt-1 flex flex-wrap gap-1">
              {columns.map((column) => (
                <code
                  key={column}
                  className="rounded bg-(--color-surface-sunken) px-1.5 py-0.5 text-[10px] font-medium text-(--color-ink-muted)"
                >
                  {column}
                </code>
              ))}
            </span>
          </span>
        </span>
      )}
    </span>
  )
}
