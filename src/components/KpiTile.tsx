import type { ReactNode } from 'react'
import { PALETTE } from '@/config/theme'
import { HelpTip } from './HelpTip'
import { stagger } from '@/lib/motion'

interface KpiTileProps {
  label: string
  value: ReactNode
  /** Denominator or unit, set beside the value at reduced weight. */
  unit?: string
  caption?: string
  /** Accent colour for the icon chip and progress arc. */
  accent?: string
  icon?: ReactNode
  /** Progress rail beneath the value, 0–1. */
  ratio?: number
  /**
   * Marks a figure the source cannot yet support. Renders a dash and a
   * footnote instead of a number, so nothing unverifiable reaches a client.
   */
  pending?: boolean
  pendingNote?: string
  index?: number
  /** One-line explanation plus source columns, shown behind a "?". */
  help?: {
    what: string
    columns: readonly string[]
    missing?: boolean
  }
}

/**
 * Headline figure tile.
 *
 * The number is the largest thing on the tile by a wide margin — the brief's
 * premise is understanding the project in ten seconds, and that only works if
 * the eye lands on figures before it lands on labels.
 */
export function KpiTile({
  label,
  value,
  unit,
  caption,
  accent = PALETTE.primary,
  icon,
  ratio,
  pending = false,
  pendingNote,
  index,
  help,
}: KpiTileProps) {
  return (
    <div
      className={`card p-5 ${index !== undefined ? 'rise' : ''}`}
      style={index !== undefined ? stagger(index) : undefined}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="field flex items-center gap-1.5">
            <span className="truncate">{label}</span>
            {help && <HelpTip label={label} {...help} />}
          </p>

          <p className="mt-2 flex items-baseline gap-1.5">
            <span
              className="num text-[28px] leading-none font-bold tracking-tight"
              style={{ color: pending ? PALETTE.inkFaint : PALETTE.ink }}
            >
              {value}
            </span>
            {unit && (
              <span className="num text-sm font-medium text-(--color-ink-faint)">
                {unit}
              </span>
            )}
          </p>
        </div>

        {icon && (
          <span
            aria-hidden="true"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
            style={{
              backgroundColor: pending ? PALETTE.surfaceSunken : `${accent}18`,
              color: pending ? PALETTE.inkFaint : accent,
            }}
          >
            {icon}
          </span>
        )}
      </div>

      {ratio !== undefined && !pending && (
        <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-(--color-surface-sunken)">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(Math.max(ratio, 0), 1) * 100}%`,
              backgroundColor: accent,
            }}
          />
        </div>
      )}

      {caption && (
        <p className="mt-2.5 truncate text-xs text-(--color-ink-muted)">{caption}</p>
      )}

      {pending && pendingNote && (
        <p className="mt-2.5 border-t border-(--color-gridline) pt-2.5 text-[11px] leading-snug text-(--color-ink-faint)">
          {pendingNote}
        </p>
      )}
    </div>
  )
}
