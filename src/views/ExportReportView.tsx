import { useState } from 'react'
import { AttentionPanel } from '@/components/AttentionPanel'
import { StatusPill } from '@/components/StatusPill'
import { SharePopover } from '@/components/SharePopover'
import { COPY } from '@/config/copy'
import {
  GRADIENT,
  READINESS_COLOR,
  STATUS_TEXT,
  STATUS_WASH,
} from '@/config/theme'
import type { ProjectAnalysis } from '@/hooks/useProjectAnalysis'
import { formatAvailability } from '@/lib/format'
import { formatWeek } from '@/lib/weeks'
import type { Project } from '@/types/domain'

interface ExportReportViewProps {
  project: Project
  analysis: ProjectAnalysis
  /** False in the customer view — a shared link cannot re-share itself. */
  canShare?: boolean
}

const SECTIONS = [
  { id: 'summary', label: 'Executive summary' },
  { id: 'progress', label: 'Production progress' },
  { id: 'moulds', label: 'Mould readiness' },
  { id: 'schedule', label: 'Production schedule' },
  { id: 'risks', label: 'Attention & risks' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

/**
 * Composes the customer report on screen and prints it.
 *
 * `window.print()` against the print stylesheet avoids a PDF dependency, and
 * guarantees the client receives exactly the document they previewed.
 */
export function ExportReportView({
  project,
  analysis,
  canShare = false,
}: ExportReportViewProps) {
  const [selected, setSelected] = useState<Set<SectionId>>(
    () => new Set(SECTIONS.map((section) => section.id)),
  )

  const toggle = (id: SectionId) =>
    setSelected((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const { kpis, moulds, callOffs, findings, level } = analysis
  const infeasible = moulds.filter((mould) => !mould.feasible)

  return (
    <div className="space-y-4">
      <div className="no-print">
        <h1 className="text-2xl font-bold tracking-tight">Customer report</h1>
        <p className="mt-0.5 text-sm text-(--color-ink-muted)">
          {canShare
            ? 'Share a link that always shows the latest data, or print a PDF snapshot.'
            : 'Choose the sections to include, then print to PDF.'}
        </p>
      </div>

      {/* Stacks above the report card below it: the `rise` transform makes
          this a stacking context, so the popover's own z-index cannot lift it
          over a later sibling on its own. */}
      <div className="card rise no-print relative z-20 px-5 py-4">
        <fieldset>
          <legend className="field mb-2">Sections</legend>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {SECTIONS.map((section) => (
              <label
                key={section.id}
                className="flex min-h-11 cursor-pointer items-center gap-2 pr-1 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selected.has(section.id)}
                  onChange={() => toggle(section.id)}
                  className="h-5 w-5 cursor-pointer accent-(--color-primary)"
                />
                {section.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => window.print()}
            disabled={selected.size === 0}
            className="min-h-11 cursor-pointer rounded-xl px-5 text-sm font-semibold text-white shadow-[var(--shadow-rest)] transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: GRADIENT.brand }}
          >
            Download PDF
          </button>

          {canShare && <SharePopover project={project} />}
        </div>

        {canShare && (
          <p className="mt-2.5 text-[11px] leading-relaxed text-(--color-ink-faint)">
            A link stays current as the Excel is updated. A PDF is a snapshot of
            today and will not.
          </p>
        )}
      </div>

      <article className="card rise space-y-7 p-8">
        <header className="border-b border-(--color-border) pb-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">{project.name}</h2>
              <p className="text-sm text-(--color-ink-muted)">
                {project.client} · Production &amp; mould readiness
              </p>
            </div>
            <div className="text-right">
              <StatusPill level={level} size="md" />
              <p className="mt-1 text-xs text-(--color-ink-faint)">
                {COPY.dataCurrencyPrefix} {project.dataAsOf}
              </p>
            </div>
          </div>
        </header>

        {selected.has('summary') && (
          <Section title="Executive summary">
            <p className="text-sm leading-relaxed text-(--color-ink-muted)">
              {project.name} comprises <Strong>{kpis.totalPieces} pieces</Strong> across{' '}
              <Strong>{kpis.uniqueItems} distinct products</Strong>, produced from{' '}
              <Strong>{kpis.mouldCount} moulds</Strong>
              {kpis.callOffCount > 0 && (
                <>
                  {' '}
                  and organised into <Strong>{kpis.callOffCount} call-offs</Strong>
                </>
              )}
              . {kpis.mouldsReady} of {kpis.mouldCount} moulds are ready, with{' '}
              {kpis.mouldsPending} carrying a scheduled completion date. Production
              runs{' '}
              {kpis.firstWeek && kpis.lastWeek
                ? `from ${formatWeek(kpis.firstWeek)} to ${formatWeek(kpis.lastWeek)}`
                : 'to a schedule still being set'}{' '}
              at one piece per mould per working day, so each outstanding piece
              is <Strong>one working day</Strong> on its mould.
            </p>

            {infeasible.length > 0 && (
              <p
                className="mt-3 rounded-2xl p-4 text-xs leading-relaxed"
                style={{
                  backgroundColor: STATUS_WASH.critical,
                  color: STATUS_TEXT.critical,
                }}
              >
                <Strong>
                  {infeasible.length === 1
                    ? '1 mould cannot finish inside its planned window.'
                    : `${infeasible.length} moulds cannot finish inside their planned windows.`}
                </Strong>{' '}
                {infeasible
                  .map(
                    (mould) =>
                      `${mould.name} has ${mould.remainingPieces} pcs outstanding, needing ${mould.productionDaysRequired} working days against ${mould.availableWorkingDays} remaining`,
                  )
                  .join('; ')}
                .{' '}
                {infeasible.some((m) => m.producedPieces === null) &&
                  'Completion is not recorded in this source, so the full quantity is assumed outstanding.'}
              </p>
            )}
            <p className="mt-3 rounded-2xl bg-(--color-surface-alt) p-4 text-xs leading-relaxed text-(--color-ink-muted)">
              <Strong>Completion figures are not included.</Strong>{' '}
              {COPY.completionPending}
            </p>
          </Section>
        )}

        {selected.has('progress') && (
          <Section title="Production progress">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Figure label="Pieces" value={String(kpis.totalPieces)} />
              <Figure label="Products" value={String(kpis.uniqueItems)} />
              <Figure
                label="Completed"
                value={kpis.producedPieces === null ? '—' : String(kpis.producedPieces)}
                muted={kpis.producedPieces === null}
              />
              <Figure
                label="Next week"
                value={kpis.nextProductionWeek ? formatWeek(kpis.nextProductionWeek) : '—'}
              />
            </div>

            {callOffs.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="data-grid">
                <thead>
                  <tr>
                    <th scope="col">Call-off</th>
                    <th scope="col" className="text-right">Products</th>
                    <th scope="col" className="text-right">Pieces</th>
                    <th scope="col">Window</th>
                  </tr>
                </thead>
                <tbody>
                  {callOffs.map((callOff) => (
                    <tr key={callOff.callOff}>
                      <td className="font-medium">
                        {String(callOff.callOff).padStart(2, '0')}
                      </td>
                      <td className="num text-right">{callOff.itemCount}</td>
                      <td className="num text-right">{callOff.totalQty}</td>
                      <td className="text-(--color-ink-muted)">
                        {callOff.firstWeek && callOff.lastWeek
                          ? `${formatWeek(callOff.firstWeek)} → ${formatWeek(callOff.lastWeek)}`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </Section>
        )}

        {selected.has('moulds') && (
          <Section title="Mould readiness">
            <div className="mb-4 flex gap-4">
              <Legend color={READINESS_COLOR.ready} label={`${kpis.mouldsReady} ready`} />
              <Legend
                color={READINESS_COLOR.pending}
                label={`${kpis.mouldsPending} pending`}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="data-grid">
              <thead>
                <tr>
                  <th scope="col">Mould</th>
                  <th scope="col" className="text-right">Products</th>
                  <th scope="col" className="text-right">Pieces</th>
                  <th scope="col">Available</th>
                  <th scope="col" className="text-right">Remaining</th>
                  <th scope="col" className="text-right">Days needed</th>
                  <th scope="col" className="text-right">Days left</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {moulds.map((mould) => (
                  <tr key={mould.name}>
                    <td className="font-medium">{mould.name}</td>
                    <td className="num text-right">{mould.itemCount}</td>
                    <td className="num text-right">{mould.totalQty}</td>
                    <td className="text-(--color-ink-muted)">
                      {formatAvailability(mould.availability)}
                    </td>
                    <td className="num text-right font-semibold">
                      {mould.remainingPieces}
                    </td>
                    <td className="num text-right">
                      {mould.productionDaysRequired}
                    </td>
                    <td
                      className="num text-right"
                      style={{
                        color: mould.feasible ? undefined : STATUS_TEXT.critical,
                        fontWeight: mould.feasible ? undefined : 600,
                      }}
                    >
                      {mould.availableWorkingDays}
                      {!mould.feasible && ` (−${Math.abs(mould.dayShortfall)})`}
                    </td>
                    <td>
                      <StatusPill level={mould.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </Section>
        )}

        {selected.has('schedule') && (
          <Section title="Production schedule">
            <div className="overflow-x-auto">
              <table className="data-grid">
              <thead>
                <tr>
                  <th scope="col">Week</th>
                  <th scope="col" className="text-right">Pieces</th>
                  <th scope="col" className="text-right">Moulds</th>
                  <th scope="col" className="text-right">Capacity used</th>
                </tr>
              </thead>
              <tbody>
                {analysis.load.map((week) => (
                  <tr key={`${week.week.year}-${week.week.week}`}>
                    <td className="font-medium">{formatWeek(week.week)}</td>
                    <td className="num text-right">{Math.round(week.pieces)}</td>
                    <td className="num text-right">{week.mouldCount}</td>
                    <td className="num text-right text-(--color-ink-muted)">
                      {week.pieceCapacity}
                    </td>
                    <td
                      className="num text-right"
                      style={{
                        color: week.overCapacity ? STATUS_TEXT.critical : undefined,
                        fontWeight: week.overCapacity ? 600 : undefined,
                      }}
                    >
                      {Math.round(week.utilisation * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-(--color-ink-faint)">
              Capacity is the active moulds for that week at one piece per mould
              per working day. {COPY.spreadCaveat}
            </p>
          </Section>
        )}

        {selected.has('risks') && (
          <Section title="Attention & risks">
            <AttentionPanel findings={findings} bare />
          </Section>
        )}

        <footer className="border-t border-(--color-border) pt-4 text-[11px] text-(--color-ink-faint)">
          Source: {project.source} · {COPY.footer}
        </footer>
      </article>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-base font-bold">{title}</h3>
      {children}
    </section>
  )
}

function Strong({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-(--color-ink)">{children}</span>
}

function Figure({
  label,
  value,
  muted = false,
}: {
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <div className="rounded-2xl bg-(--color-surface-alt) p-4">
      <p className="field">{label}</p>
      <p
        className="num text-xl font-bold"
        style={{ color: muted ? 'var(--color-ink-faint)' : undefined }}
      >
        {value}
      </p>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-(--color-ink-muted)">
      <span
        aria-hidden="true"
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  )
}
