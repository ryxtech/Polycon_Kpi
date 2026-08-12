import { useMemo, useState } from 'react'
import { GanttChart } from '@/components/GanttChart'
import { NoElementData } from '@/components/NoElementData'
import { Card } from '@/components/Card'
import { COPY } from '@/config/copy'
import { seriesColor } from '@/config/theme'
import type { ProjectAnalysis } from '@/hooks/useProjectAnalysis'
import { formatWeek } from '@/lib/weeks'
import type { Project } from '@/types/domain'

interface ProductionPlanViewProps {
  project: Project
  analysis: ProjectAnalysis
}

const ALL = 'all'

/** Level 2 — what is produced, when, in what quantity, and under which mould. */
export function ProductionPlanView({ project, analysis }: ProductionPlanViewProps) {
  const [callOff, setCallOff] = useState<string>(ALL)
  const [mould, setMould] = useState<string>(ALL)

  const mouldOrder = useMemo(
    () => analysis.moulds.map((m) => m.name),
    [analysis.moulds],
  )

  const filtered = useMemo(
    () =>
      project.rows.filter((row) => {
        if (callOff !== ALL && String(row.callOff) !== callOff) return false
        if (mould !== ALL && row.mould !== mould) return false
        return true
      }),
    [project.rows, callOff, mould],
  )

  const pieces = filtered.reduce((sum, row) => sum + row.qty, 0)
  const filtersActive = callOff !== ALL || mould !== ALL

  if (project.rows.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader />
        <NoElementData project={project} what="The production timeline" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader />

      {/*
        Slicer bar — filters live above the canvas, not inside a visual.
        `.card` is a column flex container, so the row direction is explicit.
      */}
      <div className="card rise flex-row flex-wrap items-end gap-4 px-4 py-3.5">
        <Slicer
          label="Call-off"
          value={callOff}
          onChange={setCallOff}
          options={[
            { value: ALL, label: 'All call-offs' },
            ...analysis.callOffs.map((c) => ({
              value: String(c.callOff),
              label: `Call-off ${String(c.callOff).padStart(2, '0')} · ${c.totalQty} pcs`,
            })),
          ]}
        />
        <Slicer
          label="Mould"
          value={mould}
          onChange={setMould}
          options={[
            { value: ALL, label: 'All moulds' },
            ...analysis.moulds.map((m) => ({
              value: m.name,
              label: `${m.name} · ${m.totalQty} pcs`,
            })),
          ]}
        />

        {filtersActive && (
          <button
            type="button"
            onClick={() => {
              setCallOff(ALL)
              setMould(ALL)
            }}
            className="chip cursor-pointer bg-(--color-surface-sunken) px-3 py-2 text-(--color-ink-muted) hover:text-(--color-ink)"
          >
            Clear filters
          </button>
        )}

        <div className="ml-auto text-right">
          <p className="field">Selection</p>
          <p className="num text-sm font-semibold">
            {filtered.length} entries · {pieces} pcs
          </p>
        </div>
      </div>

      <Card
        title="Production timeline"
        subtitle={
          analysis.kpis.firstWeek && analysis.kpis.lastWeek
            ? `${formatWeek(analysis.kpis.firstWeek)} → ${formatWeek(analysis.kpis.lastWeek)} · ISO week numbers`
            : ''
        }
        actions={
          <div className="hidden max-w-md flex-wrap justify-end gap-x-2.5 gap-y-1 lg:flex">
            {analysis.moulds.map((m, index) => (
              <span
                key={m.name}
                className="inline-flex items-center gap-1 text-[10px] text-(--color-ink-muted)"
              >
                <span
                  aria-hidden="true"
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: seriesColor(index) }}
                />
                {m.name}
              </span>
            ))}
          </div>
        }
      >
        <GanttChart rows={filtered} mouldOrder={mouldOrder} />
        <p className="mt-2 border-t border-(--color-gridline) pt-2 text-[11px] text-(--color-ink-faint)">
          {COPY.spreadCaveat}
        </p>
      </Card>
    </div>
  )
}

function PageHeader() {
  return (
    <header className="rise">
      <h1 className="text-2xl font-bold tracking-tight">Production plan</h1>
      <p className="mt-0.5 text-sm text-(--color-ink-muted)">
        Every scheduled entry across the production calendar, coloured by mould.
      </p>
    </header>
  )
}

function Slicer({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  const id = `slicer-${label.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <div>
      <label htmlFor={id} className="field mb-1 block">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="cursor-pointer rounded-xl bg-(--color-surface-sunken) px-3 py-2 text-[13px] font-medium text-(--color-ink) transition-shadow hover:shadow-[var(--shadow-rest)]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
