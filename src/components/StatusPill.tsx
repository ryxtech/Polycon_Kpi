import {
  STATUS_COLOR,
  STATUS_LABEL,
  STATUS_TEXT,
  STATUS_WASH,
} from '@/config/theme'
import type { RiskLevel } from '@/types/domain'

interface StatusPillProps {
  level: RiskLevel
  label?: string
  size?: 'sm' | 'md'
  /** Suppresses the dot where the surrounding row already carries a swatch. */
  bare?: boolean
}

/**
 * Status carried by three signals at once: a shape, a colour and a word.
 *
 * Colour alone would exclude anyone who cannot separate the hues, and on a
 * production floor the difference between amber and red is the difference
 * between watching something and acting on it.
 *
 * The dot uses the saturated fill; the label uses a darker tone so it clears
 * 4.5:1 against the wash behind it.
 */
export function StatusPill({
  level,
  label,
  size = 'sm',
  bare = false,
}: StatusPillProps) {
  return (
    <span
      className={`chip ${size === 'md' ? 'px-3 py-1 text-[13px]' : ''}`}
      style={{ backgroundColor: STATUS_WASH[level], color: STATUS_TEXT[level] }}
    >
      {!bare && (
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: STATUS_COLOR[level] }}
        />
      )}
      {label ?? STATUS_LABEL[level]}
    </span>
  )
}
