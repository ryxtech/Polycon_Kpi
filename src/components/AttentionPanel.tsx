import { useState } from 'react'
import { STATUS_COLOR, STATUS_TEXT, STATUS_WASH } from '@/config/theme'
import type { RiskFinding } from '@/types/domain'
import { Card } from './Card'
import { IconAlert, IconCheck } from './icons'

interface AttentionPanelProps {
  findings: RiskFinding[]
  title?: string
  /** Renders without the Card chrome, for embedding in the printed report. */
  bare?: boolean
  index?: number
  /** Findings shown before the panel collapses the rest behind a control. */
  limit?: number
}

const CATEGORY_LABEL: Record<RiskFinding['category'], string> = {
  capacity: 'Capacity',
  'mould-readiness': 'Mould readiness',
  'load-balance': 'Load balance',
}

/**
 * Findings the client should not have to hunt for.
 *
 * Each entry carries the arithmetic that produced it. A claim a production
 * manager cannot check is a claim they will not act on, so the numbers travel
 * with the finding rather than sitting a click away.
 */
export function AttentionPanel({
  findings,
  title = 'Attention required',
  bare = false,
  index,
  limit = 6,
}: AttentionPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const open = findings.filter((finding) => finding.level !== 'on-schedule').length

  /*
   * Findings arrive most-severe-first, so truncating keeps the ones that
   * matter. A panel of fourteen is honest but unreadable — and an unreadable
   * list of problems gets treated as no list at all.
   */
  const showAll = bare || expanded || findings.length <= limit
  const visible = showAll ? findings : findings.slice(0, limit)
  const hidden = findings.length - visible.length

  const body =
    findings.length === 0 ? (
      <p className="text-sm text-(--color-ink-muted)">
        No exposure detected in the current schedule.
      </p>
    ) : (
      <ul className="space-y-2">
        {visible.map((finding) => (
          <li
            key={finding.id}
            className="flex items-start gap-3 rounded-2xl px-3.5 py-3"
            style={{ backgroundColor: STATUS_WASH[finding.level] }}
          >
            {/*
              The glyph repeats the severity, so colour is never the only
              signal — and good news must not wear an alert icon.
            */}
            <span
              aria-hidden="true"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full"
              style={{
                backgroundColor: STATUS_COLOR[finding.level],
                color: '#fff',
              }}
            >
              {finding.level === 'on-schedule' ? (
                <IconCheck size={15} />
              ) : (
                <IconAlert size={15} />
              )}
            </span>

            <div className="min-w-0">
              <p className="text-[13px] leading-snug font-semibold text-(--color-ink)">
                {finding.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-(--color-ink-muted)">
                <span
                  className="font-semibold"
                  style={{ color: STATUS_TEXT[finding.level] }}
                >
                  {CATEGORY_LABEL[finding.category]}
                </span>{' '}
                · {finding.detail}
              </p>
            </div>
          </li>
        ))}
      </ul>
    )

  const withToggle = (
    <>
      {body}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-3 min-h-11 w-full cursor-pointer rounded-xl bg-(--color-surface-sunken) px-3 text-[13px] font-medium text-(--color-ink-muted) transition-colors hover:text-(--color-ink)"
        >
          Show {hidden} more {hidden === 1 ? 'finding' : 'findings'}
        </button>
      )}
      {expanded && findings.length > limit && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-3 min-h-11 w-full cursor-pointer rounded-xl bg-(--color-surface-sunken) px-3 text-[13px] font-medium text-(--color-ink-muted) transition-colors hover:text-(--color-ink)"
        >
          Show fewer
        </button>
      )}
    </>
  )

  if (bare) return body

  return (
    <Card
      index={index}
      title={title}
      subtitle={
        findings.length === 0
          ? 'Nothing outstanding'
          : `${open} open · ${findings.length} total`
      }
    >
      {withToggle}
    </Card>
  )
}
