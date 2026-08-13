import { useEffect, useMemo, useState } from 'react'
import { AttentionPanel } from '@/components/AttentionPanel'
import { BulletChart, type BulletRow } from '@/components/BulletChart'
import { CapacityChart } from '@/components/CapacityChart'
import { Card } from '@/components/Card'
import { Donut } from '@/components/Donut'
import { FilterBar } from '@/components/FilterBar'
import { HelpTip } from '@/components/HelpTip'
import { KpiTile } from '@/components/KpiTile'
import { ProgressBreakdown } from '@/components/ProgressBreakdown'
import { StatusPill } from '@/components/StatusPill'
import {
  IconAlert,
  IconCalendar,
  IconCube,
  IconGauge,
  IconStack,
} from '@/components/icons'
import { COPY, KPI_HELP } from '@/config/copy'
import { PALETTE, READINESS_COLOR, STATUS_COLOR } from '@/config/theme'
import { analyseRows, type ProjectAnalysis } from '@/hooks/useProjectAnalysis'
import {
  applyCrossFilter,
  filterBy,
  sameFilter,
  type CrossFilter,
} from '@/lib/crossFilter'
import { pluralise } from '@/lib/format'
import { formatWeek, formatWeekLong } from '@/lib/weeks'
import type { Project } from '@/types/domain'

interface OverviewViewProps {
  project: Project
  analysis: ProjectAnalysis
}

/**
 * Level 1 — the executive glance, laid out as a report canvas.
 *
 * Reading order is deliberate, top-left to bottom-right: the tile ribbon
 * answers "how big, and where are we", the wide visual answers "when", the
 * right column answers "is the tooling ready", and the bottom row answers
 * "what should I do about it".
 *
 * Every mark is also a filter. Clicking a week, mould or call-off recomputes
 * the whole canvas against that selection — the source visual keeps all its
 * marks and dims the unselected ones so the selection stays in context, while
 * everything else filters outright.
 */
export function OverviewView({ project, analysis }: OverviewViewProps) {
  const [filter, setFilter] = useState<CrossFilter | null>(null)

  // Escape clears — the convention a user already expects from a modal or a
  // search field, and free to honour here.
  useEffect(() => {
    if (!filter) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFilter(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [filter])

  // Selecting the same mark again clears it, so any click is reversible by
  // repeating it rather than by hunting for the clear button.
  const toggle = (next: CrossFilter) =>
    setFilter((current) => (sameFilter(current, next) ? null : next))

  const filteredRows = useMemo(
    () => applyCrossFilter(project.rows, filter),
    [project.rows, filter],
  )

  const view = useMemo(
    () => (filter ? analyseRows(filteredRows, project) : analysis),
    [filter, filteredRows, project, analysis],
  )

  const { kpis, moulds, callOffs, findings, level } = view

  // A workbook reports when a mould becomes available; a published form
  // schedule reports whether the form is on time. The labels must not blur them.
  const fromFormSchedule = Boolean(project.encodedMoulds?.length)
  const openFindings = findings.filter((f) => f.level !== 'on-schedule').length

  const callOffRows: BulletRow[] = callOffs.map((callOff) => ({
    id: String(callOff.callOff),
    label: `Call-off ${String(callOff.callOff).padStart(2, '0')}`,
    value: callOff.totalQty,
    max: analysis.kpis.totalPieces,
    display: pluralise(callOff.totalQty, 'pc'),
    note:
      callOff.firstWeek && callOff.lastWeek
        ? `${pluralise(callOff.itemCount, 'product')} · ${formatWeek(callOff.firstWeek)} → ${formatWeek(callOff.lastWeek)}`
        : pluralise(callOff.itemCount, 'product'),
  }))

  const tightest = [...moulds]
    .filter((mould) => mould.bufferDays !== null)
    .sort((a, b) => (a.bufferDays ?? 0) - (b.bufferDays ?? 0))[0]

  return (
    <div className="space-y-4">
      {filter && (
        <FilterBar
          filter={filter}
          entries={filteredRows.length}
          totalEntries={project.rows.length}
          pieces={kpis.totalPieces}
          totalPieces={analysis.kpis.totalPieces}
          onClear={() => setFilter(null)}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiTile
          index={0}
          label="Overall production"
          help={KPI_HELP.overallProduction}
          value={
            kpis.completionRatio === null
              ? '—'
              : `${Math.round(kpis.completionRatio * 100)}%`
          }
          caption={`of ${kpis.totalPieces} pieces`}
          icon={<IconGauge size={17} />}
          pending={kpis.completionRatio === null}
          pendingNote={COPY.completionPending}
        />
        <KpiTile
          index={1}
          label="Elements produced"
          help={KPI_HELP.elementsProduced}
          value={kpis.producedPieces === null ? '—' : String(kpis.producedPieces)}
          unit={`/ ${kpis.totalPieces}`}
          caption={`${kpis.uniqueItems} distinct products`}
          icon={<IconStack size={17} />}
          pending={kpis.producedPieces === null}
        />
        <KpiTile
          index={2}
          label={fromFormSchedule ? 'Forms on schedule' : 'Moulds ready'}
          help={KPI_HELP.mouldsReady}
          value={String(kpis.mouldsReady)}
          unit={`/ ${kpis.mouldCount}`}
          ratio={kpis.mouldCount === 0 ? 0 : kpis.mouldsReady / kpis.mouldCount}
          accent={READINESS_COLOR.ready}
          icon={<IconCube size={17} />}
          caption={
            fromFormSchedule
              ? `${kpis.mouldsPending} need attention`
              : `${kpis.mouldsPending} awaiting completion`
          }
        />
        <KpiTile
          index={3}
          label="Next production"
          help={KPI_HELP.nextProduction}
          value={kpis.nextProductionWeek ? formatWeek(kpis.nextProductionWeek) : '—'}
          icon={<IconCalendar size={17} />}
          caption={
            kpis.nextProductionWeek
              ? formatWeekLong(kpis.nextProductionWeek).split(' · ')[1]
              : 'Nothing scheduled'
          }
        />
        <KpiTile
          index={4}
          label="Open findings"
          help={KPI_HELP.openFindings}
          value={String(openFindings)}
          accent={openFindings > 0 ? STATUS_COLOR[level] : PALETTE.primary}
          icon={<IconAlert size={17} />}
          caption={
            kpis.firstWeek && kpis.lastWeek
              ? `${formatWeek(kpis.firstWeek)} → ${formatWeek(kpis.lastWeek)}`
              : 'No schedule window'
          }
        />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <Card
          index={5}
          title="Weekly production load"
          subtitle={
            analysis.kpis.firstWeek && analysis.kpis.lastWeek
              ? `${formatWeek(analysis.kpis.firstWeek)} → ${formatWeek(analysis.kpis.lastWeek)} · select a week to filter the report`
              : 'No schedule'
          }
          actions={<StatusPill level={level} />}
        >
          {analysis.load.length > 0 ? (
            <CapacityChart
              load={analysis.load}
              highlight={filter?.dimension === 'week' ? filter.value : null}
              onSelectWeek={(selected) =>
                selected === null
                  ? setFilter(null)
                  : toggle(filterBy.week(selected))
              }
            />
          ) : (
            <p className="text-sm text-(--color-ink-muted)">
              No element-level schedule for this project — see Production plan.
            </p>
          )}
        </Card>

        <Card
          index={6}
          title={fromFormSchedule ? 'Form readiness' : 'Mould readiness'}
          subtitle={filter ? 'Within the current selection' : 'Current tooling status'}
        >
          <div className="flex justify-center pt-1 pb-3">
            <Donut
              segments={[
                {
                  label: fromFormSchedule ? 'On schedule' : 'Ready',
                  value: kpis.mouldsReady,
                  color: READINESS_COLOR.ready,
                },
                {
                  label: fromFormSchedule ? 'Needs attention' : 'Pending',
                  value: kpis.mouldsPending,
                  color: READINESS_COLOR.pending,
                },
              ]}
              centerValue={
                kpis.mouldCount === 0
                  ? '—'
                  : `${Math.round((kpis.mouldsReady / kpis.mouldCount) * 100)}%`
              }
              centerLabel={fromFormSchedule ? 'On time' : 'Ready'}
            />
          </div>

          <ul className="space-y-2">
            <ReadinessRow
              color={READINESS_COLOR.ready}
              label={fromFormSchedule ? 'Forms on schedule' : 'Ready to spray'}
              value={kpis.mouldsReady}
            />
            <ReadinessRow
              color={READINESS_COLOR.pending}
              label={fromFormSchedule ? 'Forms needing attention' : 'Completion date set'}
              value={kpis.mouldsPending}
            />
          </ul>

          <p className="mt-3.5 border-t border-(--color-gridline) pt-3 text-[11px] leading-relaxed text-(--color-ink-faint)">
            {fromFormSchedule
              ? 'Status as issued in the published form production schedule.'
              : tightest
                ? `Tightest buffer: ${tightest.name}. Measured against the first week each mould's items are due.`
                : 'No mould data in this selection.'}
          </p>
        </Card>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Card
          index={7}
          title="Production progress"
          subtitle={`${kpis.totalPieces} pieces planned`}
          actions={
            <HelpTip label="Production progress" {...KPI_HELP.productionProgress} />
          }
        >
          <ProgressBreakdown
            planned={kpis.totalPieces}
            completed={kpis.producedPieces}
          />
        </Card>

        <AttentionPanel findings={findings} index={8} />

        <Card
          index={9}
          title="Scope by call-off"
          subtitle={
            callOffs.length > 0
              ? `${kpis.totalPieces} pieces · select to filter`
              : 'Not used by this project'
          }
        >
          {callOffs.length > 0 ? (
            <>
              <BulletChart
                rows={callOffRows}
                selectedId={
                  filter?.dimension === 'callOff' ? String(filter.value) : null
                }
                onSelect={(id) => toggle(filterBy.callOff(Number(id)))}
              />
              <p className="mt-3.5 border-t border-(--color-gridline) pt-3 text-[11px] text-(--color-ink-faint)">
                Bars show each call-off's share of scope, not completion.
              </p>
            </>
          ) : (
            <p className="text-sm text-(--color-ink-muted)">
              This project's documents do not use call-offs. Source: {project.source}
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}

function ReadinessRow({
  color,
  label,
  value,
}: {
  color: string
  label: string
  value: number
}) {
  return (
    <li className="flex items-center gap-2.5 rounded-xl bg-(--color-surface-alt) px-3 py-2.5 text-[13px]">
      <span
        aria-hidden="true"
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="min-w-0 flex-1 truncate text-(--color-ink-muted)">{label}</span>
      <span className="num font-bold">{value}</span>
    </li>
  )
}
