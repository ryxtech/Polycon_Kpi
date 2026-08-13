import { useState } from 'react'
import { MouldDrawer } from '@/components/MouldDrawer'
import { HelpTip } from '@/components/HelpTip'
import { StatusPill } from '@/components/StatusPill'
import { Card } from '@/components/Card'
import { BulletChart, type BulletRow } from '@/components/BulletChart'
import { IconChevronRight } from '@/components/icons'
import { KPI_HELP } from '@/config/copy'
import { STATUS_TEXT } from '@/config/theme'
import type { ProjectAnalysis } from '@/hooks/useProjectAnalysis'
import { formatAvailability, pluralise } from '@/lib/format'
import { formatWeek } from '@/lib/weeks'
import type { EncodedMould, MouldSummary, Project } from '@/types/domain'

interface MouldReadinessViewProps {
  project: Project
  analysis: ProjectAnalysis
}

const STATUS_RANK = { critical: 0, 'limited-buffer': 1, 'on-schedule': 2 } as const

/** Level 3 — which mould, how many products, ready when, and what the risk is. */
export function MouldReadinessView({ project, analysis }: MouldReadinessViewProps) {
  const [selected, setSelected] = useState<MouldSummary | null>(null)
  const { moulds } = analysis
  const encoded = project.encodedMoulds

  const volumeRows: BulletRow[] = [...(encoded ?? [])]
    .sort((a, b) => b.totalQty - a.totalQty)
    .slice(0, 8)
    .map((form) => ({
      label: form.name,
      value: form.totalQty,
      max: Math.max(...(encoded ?? []).map((f) => f.totalQty), 1),
      display: pluralise(form.totalQty, 'pc'),
      level: form.status,
      note: pluralise(form.productCount, 'product'),
    }))

  const derivedVolume: BulletRow[] = [...moulds]
    .sort((a, b) => b.totalQty - a.totalQty)
    .map((mould) => ({
      label: mould.name,
      value: mould.totalQty,
      max: Math.max(...moulds.map((m) => m.totalQty), 1),
      display: pluralise(mould.totalQty, 'pc'),
      level: mould.status,
      note: `${pluralise(mould.itemCount, 'product')} · ${
        mould.firstWeek && mould.lastWeek
          ? `${formatWeek(mould.firstWeek)} → ${formatWeek(mould.lastWeek)}`
          : 'not scheduled'
      }`,
    }))

  return (
    <div className="space-y-4">
      <header className="rise">
        <h1 className="text-2xl font-bold tracking-tight">Mould readiness</h1>
        <p className="mt-0.5 text-sm text-(--color-ink-muted)">
          Every form, what it produces, and how much slack sits between it being
          ready and the first week its items are due.
        </p>
      </header>

      {encoded && encoded.length > 0 && (
        <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EncodedFormTable forms={encoded} source={project.source} />
          <Card title="Volume by form" subtitle="Largest eight">
            <BulletChart rows={volumeRows} />
          </Card>
        </div>
      )}

      {moulds.length > 0 && (
        <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card
            title="Mould schedule"
            subtitle="Days needed = pieces still to make, at 1 pc/mould/day"
            actions={<HelpTip label="Days needed" {...KPI_HELP.daysNeeded} />}
            flush
          >
            <div className="overflow-x-auto">
              <table className="data-grid">
                <thead>
                  <tr>
                    <th scope="col">Mould</th>
                    <th scope="col" className="text-right">Products</th>
                    <th scope="col" className="text-right">Entries</th>
                    <th scope="col" className="text-right">Pieces</th>
                    <th scope="col">Available</th>
                    <th scope="col">Window</th>
                    <th
                      scope="col"
                      className="text-right"
                      title="Pieces already produced, from the source"
                    >
                      Made
                    </th>
                    <th
                      scope="col"
                      className="text-right"
                      title="Pieces still to make: ordered less produced"
                    >
                      Left
                    </th>
                    <th
                      scope="col"
                      className="text-right"
                      title="One working day per remaining piece"
                    >
                      Days needed
                    </th>
                    <th
                      scope="col"
                      className="text-right"
                      title="Working days remaining before this mould's window closes"
                    >
                      Days left
                    </th>
                    <th scope="col">Status</th>
                    <th scope="col" aria-label="Open detail" />
                  </tr>
                </thead>
                <tbody>
                  {moulds.map((mould) => (
                    <tr
                      key={mould.name}
                      tabIndex={0}
                      role="button"
                      onClick={() => setSelected(mould)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setSelected(mould)
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <td className="font-semibold">{mould.name}</td>
                      <td className="num text-right">{mould.itemCount}</td>
                      <td className="num text-right text-(--color-ink-faint)">
                        {mould.scheduledRows}
                      </td>
                      <td className="num text-right">{mould.totalQty}</td>
                      <td className="whitespace-nowrap text-(--color-ink-muted)">
                        {formatAvailability(mould.availability)}
                      </td>
                      <td className="num whitespace-nowrap text-(--color-ink-muted)">
                        {mould.firstWeek && mould.lastWeek
                          ? `${formatWeek(mould.firstWeek)} → ${formatWeek(mould.lastWeek)}`
                          : '—'}
                      </td>
                      <td
                        className="num text-right"
                        style={{ color: 'var(--color-ink-faint)' }}
                        title={
                          mould.producedPieces === null
                            ? 'No completion recorded in the source'
                            : undefined
                        }
                      >
                        {mould.producedPieces ?? '—'}
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
                          color: mould.feasible
                            ? 'var(--color-ink-muted)'
                            : STATUS_TEXT.critical,
                          fontWeight: mould.feasible ? undefined : 600,
                        }}
                        title={
                          mould.feasible
                            ? `${mould.dayShortfall} days of slack`
                            : `Short by ${Math.abs(mould.dayShortfall)} working days`
                        }
                      >
                        {mould.availableWorkingDays}
                        {!mould.feasible && ` (−${Math.abs(mould.dayShortfall)})`}
                      </td>
                      <td>
                        <StatusPill level={mould.status} />
                      </td>
                      <td className="text-right">
                        <IconChevronRight className="inline text-(--color-ink-faint)" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Volume by mould" subtitle="Coloured by status">
            <BulletChart rows={derivedVolume} />
          </Card>
        </div>
      )}

      {moulds.length === 0 && !encoded?.length && (
        <Card title="Mould schedule" subtitle="No data">
          <p className="mt-0.5 text-sm text-(--color-ink-muted)">
            No mould assignments in this project's data.
          </p>
        </Card>
      )}

      <MouldDrawer mould={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

/**
 * Forms transcribed from a published form schedule, where Polycon's planning
 * already fixed the status. Shown separately so a derived figure is never
 * confused with one they issued themselves.
 */
function EncodedFormTable({
  forms,
  source,
}: {
  forms: EncodedMould[]
  source: string
}) {
  const ordered = [...forms].sort((a, b) => {
    const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status]
    return rank !== 0 ? rank : (b.lateByWorkingDays ?? 0) - (a.lateByWorkingDays ?? 0)
  })

  return (
    <Card
      title="Form production schedule"
      subtitle={`Status as issued by Polycon · ${source}`}
      flush
    >
      <div className="overflow-x-auto">
        <table className="data-grid">
          <thead>
            <tr>
              <th scope="col">Form</th>
              <th scope="col" className="text-right">Priority</th>
              <th scope="col" className="text-right">Products</th>
              <th scope="col" className="text-right">Pieces</th>
              <th scope="col">Status</th>
              <th scope="col" className="text-right">Delay</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((form) => (
              <tr key={form.name}>
                <td className="font-semibold">{form.name}</td>
                <td className="num text-right text-(--color-ink-muted)">
                  {form.priority ?? '—'}
                </td>
                <td className="num text-right">{form.productCount}</td>
                <td className="num text-right">{form.totalQty}</td>
                <td>
                  <StatusPill level={form.status} />
                </td>
                <td
                  className="num text-right font-semibold"
                  style={{
                    color:
                      form.lateByWorkingDays === null
                        ? 'var(--color-ink-faint)'
                        : STATUS_TEXT.critical,
                  }}
                >
                  {form.lateByWorkingDays === null
                    ? '—'
                    : `${form.lateByWorkingDays}d late`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
