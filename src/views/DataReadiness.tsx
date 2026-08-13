import { Card } from '@/components/Card'
import { IconAlert, IconCheck } from '@/components/icons'
import {
  PALETTE,
  STATUS_COLOR,
  STATUS_TEXT,
  STATUS_WASH,
} from '@/config/theme'
import { assessDataQuality, type CapabilityState } from '@/lib/dataQuality'
import type { Project } from '@/types/domain'

interface DataReadinessProps {
  project: Project
}

const STATE_LABEL: Record<CapabilityState, string> = {
  available: 'Available now',
  partial: 'Partly available',
  blocked: 'Needs a column',
}

const STATE_TONE: Record<CapabilityState, 'on-schedule' | 'limited-buffer' | 'critical'> =
  {
    available: 'on-schedule',
    partial: 'limited-buffer',
    blocked: 'critical',
  }

/**
 * What this source supports today, and what each missing column would add.
 *
 * Lives on the import screen rather than among the report pages: which columns
 * the spreadsheet carries is Polycon's concern, not their customer's, and this
 * is already the surface about their source. Every blocked capability names the
 * column, says what appears once it exists, and gives the one-line instruction,
 * so the path forward is a short list rather than a meeting.
 */
export function DataReadiness({ project }: DataReadinessProps) {
  const quality = assessDataQuality(project)
  const blocked = quality.capabilities.filter((c) => c.state !== 'available')

  return (
    <Card
      title="Data readiness"
      subtitle={`${quality.available} of ${quality.total} capabilities supported by this source`}
    >
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-40 flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-(--color-surface-sunken)">
            <div
              className="h-full rounded-full"
              style={{
                width: `${quality.score * 100}%`,
                backgroundColor: PALETTE.primary,
              }}
            />
          </div>
        </div>
        {quality.nextStep && (
          <p className="text-[13px] text-(--color-ink-muted)">
            Next step:{' '}
            <span className="font-semibold text-(--color-ink)">
              {quality.nextStep.label}
            </span>{' '}
            — needs {quality.nextStep.requires.join(', ')}
          </p>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {quality.capabilities.map((capability) => {
          const tone = STATE_TONE[capability.state]

          return (
            <div
              key={capability.id}
              className="rounded-2xl bg-(--color-surface-alt) p-4"
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white"
                  style={{ backgroundColor: STATUS_COLOR[tone] }}
                >
                  {capability.state === 'available' ? (
                    <IconCheck size={17} />
                  ) : (
                    <IconAlert size={17} />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[15px] font-bold tracking-tight">
                      {capability.label}
                    </h2>
                    <span
                      className="chip"
                      style={{
                        backgroundColor: STATUS_WASH[tone],
                        color: STATUS_TEXT[tone],
                      }}
                    >
                      {STATE_LABEL[capability.state]}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-(--color-ink-muted)">
                    {capability.unlocks}
                  </p>
                </div>
              </div>

              <dl className="mt-3 rounded-xl bg-(--color-surface) px-3 py-2.5">
                <dt className="field">Source columns</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {capability.requires.map((column) => (
                    <code
                      key={column}
                      className="rounded-lg bg-(--color-surface) px-2 py-1 text-[11px] font-medium"
                    >
                      {column}
                    </code>
                  ))}
                </dd>
              </dl>

              {capability.action && (
                <p className="mt-3 border-t border-(--color-gridline) pt-3 text-xs leading-relaxed text-(--color-ink-muted)">
                  <span className="font-semibold text-(--color-ink)">To enable:</span>{' '}
                  {capability.action}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-4 border-t border-(--color-gridline) pt-4">
        <h3 className="field mb-2.5">Recommended sequence</h3>
        <ol className="space-y-2.5">
          {blocked.length === 0 ? (
            <li className="text-[13px] text-(--color-ink-muted)">
              This source supports every capability the product offers.
            </li>
          ) : (
            blocked.map((capability, index) => (
              <li key={capability.id} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="num grid h-6 w-6 shrink-0 place-items-center rounded-full bg-(--color-primary-wash) text-[11px] font-bold text-(--color-primary)"
                >
                  {index + 1}
                </span>
                <p className="text-[13px] leading-relaxed text-(--color-ink-muted)">
                  <span className="font-semibold text-(--color-ink)">
                    Add {capability.requires.join(' and ')}
                  </span>{' '}
                  — unlocks {capability.unlocks.toLowerCase()}.
                </p>
              </li>
            ))
          )}
        </ol>

        <p className="mt-4 text-[11px] leading-relaxed text-(--color-ink-faint)">
          Open <span className="font-medium">Sample project — complete data</span>{' '}
          from the portfolio to see the same dashboard with every column present.
        </p>
      </div>
    </Card>
  )
}
