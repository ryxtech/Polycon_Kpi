import { useState } from 'react'
import { AttentionPanel } from '@/components/AttentionPanel'
import { BulletChart, type BulletRow } from '@/components/BulletChart'
import { CapacityChart } from '@/components/CapacityChart'
import { Card } from '@/components/Card'
import { Donut } from '@/components/Donut'
import { KpiTile } from '@/components/KpiTile'
import { StatusPill } from '@/components/StatusPill'
import {
  IconAlert,
  IconCalendar,
  IconCube,
  IconGauge,
  IconStack,
} from '@/components/icons'
import { COPY } from '@/config/copy'
import { PALETTE, READINESS_COLOR, STATUS_COLOR } from '@/config/theme'
import type { ProjectAnalysis } from '@/hooks/useProjectAnalysis'
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
 */
export function OverviewView({ project, analysis }: OverviewViewProps) {
  const { kpis, moulds, callOffs, load, findings, level } = analysis
  const [week, setWeek] = useState<string | null>(null)

  // A workbook reports when a mould becomes available; a published form
  // schedule reports whether the form is on time. The labels must not blur them.
  const fromFormSchedule = Boolean(project.encodedMoulds?.length)
  const openFindings = findings.filter((f) => f.level !== 'on-schedule').length

  const callOffRows: BulletRow[] = callOffs.map((callOff) => ({
    label: `Call-off ${String(callOff.callOff).padStart(2, '0')}`,
    value: callOff.totalQty,
    max: kpis.totalPieces,
    display: `${callOff.totalQty} pcs`,
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiTile
          index={0}
          label="Overall production"
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
          value={kpis.producedPieces === null ? '—' : String(kpis.producedPieces)}
          unit={`/ ${kpis.totalPieces}`}
          caption={`${kpis.uniqueItems} distinct products`}
          icon={<IconStack size={17} />}
          pending={kpis.producedPieces === null}
        />
        <KpiTile
          index={2}
          label={fromFormSchedule ? 'Forms on schedule' : 'Moulds ready'}
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
            kpis.firstWeek && kpis.lastWeek
              ? `${formatWeek(kpis.firstWeek)} → ${formatWeek(kpis.lastWeek)} · select a week to focus`
              : 'No schedule'
          }
          actions={
            <>
              {week && (
                <button
                  type="button"
                  onClick={() => setWeek(null)}
                  className="chip cursor-pointer bg-(--color-surface-sunken) text-(--color-ink-muted) hover:text-(--color-ink)"
                >
                  Clear {week}
                </button>
              )}
              <StatusPill level={level} />
            </>
          }
        >
          {load.length > 0 ? (
            <CapacityChart load={load} highlight={week} onSelectWeek={setWeek} />
          ) : (
            <p className="text-sm text-(--color-ink-muted)">
              No element-level schedule for this project — see Production plan.
            </p>
          )}
        </Card>

        <Card
          index={6}
          title={fromFormSchedule ? 'Form readiness' : 'Mould readiness'}
          subtitle="Current tooling status"
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
                : 'No mould data.'}
          </p>
        </Card>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <AttentionPanel findings={findings} index={7} />

        <Card
          index={8}
          title="Scope by call-off"
          subtitle={
            callOffs.length > 0
              ? `${kpis.totalPieces} pieces across ${callOffs.length} call-offs`
              : 'Not used by this project'
          }
        >
          {callOffs.length > 0 ? (
            <>
              <BulletChart rows={callOffRows} />
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
