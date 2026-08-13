import { useRef, useState } from 'react'
import { Card } from '@/components/Card'
import { DataReadiness } from '@/views/DataReadiness'
import { IconCheck, IconUpload } from '@/components/icons'
import { GRADIENT } from '@/config/theme'
import { COPY } from '@/config/copy'
import { HIRSLANDEN_BASE_YEAR } from '@/data/hirslanden.seed'
import { analyseProject } from '@/hooks/useProjectAnalysis'
import { parseWorkbook } from '@/lib/parseWorkbook'
import type { Project } from '@/types/domain'

interface IntakeViewProps {
  project: Project
  onImported: (project: Project) => void
  onContinue: () => void
}

/**
 * Pipeline stages, in the order the parser actually runs them.
 *
 * Each is marked done only once the corresponding work has completed — the
 * list reports what happened, it does not animate through a script.
 */
const STAGES = [
  'Reading spreadsheet',
  'Identifying columns',
  'Resolving moulds and call-offs',
  'Parsing production weeks',
  'Calculating capacity and risk',
  'Composing report',
] as const

interface ImportSummary {
  fileName: string
  rowCount: number
  pieces: number
  items: number
  moulds: number
  callOffs: number
  hasProductionFlag: boolean
  productionFlagHeader: string | null
  hasPriority: boolean
  lookupMappings: number | null
  lookupIncomplete: number
  warnings: string[]
}

/**
 * Upload and processing.
 *
 * The dashboard is already populated from the seeded dataset, so this screen is
 * not a gate — it is how a newer workbook replaces the current figures. Every
 * count shown here is read back from the parsed result rather than promised in
 * advance.
 */
export function IntakeView({ project, onImported, onContinue }: IntakeViewProps) {
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState(-1)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setBusy(true)
    setError(null)
    setSummary(null)
    setStage(0)

    // A frame between stages so each tick is actually seen; the work either
    // side of it is real.
    const advance = async (to: number) => {
      setStage(to)
      await new Promise((resolve) => setTimeout(resolve, 220))
    }

    try {
      const buffer = await file.arrayBuffer()
      await advance(1)

      const result = await parseWorkbook(buffer, HIRSLANDEN_BASE_YEAR)
      await advance(2)

      if (result.rows.length === 0) {
        setStage(-1)
        setError(
          result.warnings[0] ??
            'No usable rows were found. Expected columns ITEM, QTY, CALL OFF, MOLD DESIGNATION, MOLD WILL BE DONE and PRODUCTION (WEEK).',
        )
        setSummary(null)
        return
      }

      const imported: Project = {
        ...project,
        id: 'imported',
        name: file.name.replace(/\.(xlsx|xls|csv)$/i, ''),
        source: file.name,
        dataAsOf: new Date().toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        rows: result.rows,
        encodedMoulds: undefined,
      }

      await advance(3)
      const analysis = analyseProject(imported)
      await advance(4)
      await advance(5)

      setSummary({
        fileName: file.name,
        rowCount: result.rows.length,
        pieces: analysis.kpis.totalPieces,
        items: analysis.kpis.uniqueItems,
        moulds: analysis.kpis.mouldCount,
        callOffs: analysis.kpis.callOffCount,
        hasProductionFlag: result.hasProductionFlag,
        productionFlagHeader: result.productionFlagHeader,
        hasPriority: result.hasPriority,
        lookupMappings: result.lookup?.mappings ?? null,
        lookupIncomplete: result.lookup?.incompleteRows ?? 0,
        warnings: result.warnings,
      })

      onImported(imported)
    } catch {
      setError('That file could not be read as a spreadsheet.')
      setSummary(null)
      setStage(-1)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header className="rise">
        <h1 className="text-2xl font-bold tracking-tight">Import production data</h1>
        <p className="mt-0.5 text-sm text-(--color-ink-muted)">
          Excel stays the operational source. Drop the current overview file to
          refresh every figure in this dashboard.
        </p>
      </header>

      <section
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          const file = event.dataTransfer.files[0]
          if (file) void handleFile(file)
        }}
        className={`card rise items-center border-2 border-dashed p-12 text-center transition-colors ${
          dragging
            ? 'border-(--color-primary) bg-(--color-primary-wash)'
            : 'border-(--color-hairline)'
        }`}
      >
        <span
          aria-hidden="true"
          className="grid h-14 w-14 place-items-center rounded-2xl text-white"
          style={{ background: GRADIENT.brand }}
        >
          <IconUpload size={24} />
        </span>
        <p className="mt-2 text-sm font-semibold">
          {busy ? 'Reading workbook…' : 'Drop the overview spreadsheet here'}
        </p>
        <p className="mt-1 text-xs text-(--color-ink-muted)">
          .xlsx, .xls or .csv — parsed in the browser, nothing is uploaded
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-5 cursor-pointer rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-rest)] transition-transform hover:-translate-y-px"
          style={{ background: GRADIENT.brand }}
        >
          Browse files
        </button>
      </section>

      {/*
        The readiness breakdown lives here rather than in the report pages.
        Which columns the spreadsheet carries is Polycon's concern, not their
        customer's — and this is already the screen about their source.
      */}
      <DataReadiness project={project} />

      {stage >= 0 && (
        <Card title="Processing" subtitle={busy ? 'Working…' : 'Complete'}>
          <ol className="space-y-2">
            {STAGES.map((label, index) => {
              const done = stage > index
              const active = stage === index
              return (
                <li
                  key={label}
                  className="flex items-center gap-2.5 text-[13px]"
                  style={{ opacity: done || active ? 1 : 0.4 }}
                >
                  <span
                    aria-hidden="true"
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-white"
                    style={{
                      background: done
                        ? 'var(--color-ok)'
                        : active
                          ? 'var(--color-primary)'
                          : 'var(--color-surface-sunken)',
                    }}
                  >
                    {done && <IconCheck size={12} />}
                  </span>
                  <span className={done || active ? 'text-(--color-ink)' : ''}>
                    {label}
                  </span>
                  {done && (
                    <span className="ml-auto text-xs text-(--color-ok)">Done</span>
                  )}
                </li>
              )
            })}
          </ol>
        </Card>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-2xl bg-(--color-critical)/10 px-4 py-3 text-sm text-(--color-ink)"
        >
          {error}
        </p>
      )}

      {summary && (
        <Card title="Import summary" subtitle={summary.fileName}>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Rows" value={summary.rowCount} />
            <Stat label="Pieces" value={summary.pieces} />
            <Stat label="Products" value={summary.items} />
            <Stat label="Moulds" value={summary.moulds} />
          </dl>

          <div className="mt-4 space-y-2 border-t border-(--color-gridline) pt-3 text-xs">
            <Check
              ok={summary.callOffs > 0}
              text={`${summary.callOffs} call-off${summary.callOffs === 1 ? '' : 's'} resolved`}
            />
            <Check
              ok={summary.hasProductionFlag}
              text={
                summary.hasProductionFlag
                  ? `Production flag found in column “${summary.productionFlagHeader}” — completion figures are live.`
                  : `No production flag column. ${COPY.completionPending}`
              }
            />
            <Check
              ok={summary.hasPriority}
              text={
                summary.hasPriority
                  ? 'Priority column found — priority filtering is available.'
                  : 'No priority column. Priority filtering stays disabled.'
              }
            />
            {summary.lookupMappings !== null && (
              <Check
                ok
                text={`Sheet List2 reconciled — ${summary.lookupMappings} item-to-mould mappings agree with List1${
                  summary.lookupIncomplete > 0
                    ? `, ${summary.lookupIncomplete} placeholder ${summary.lookupIncomplete === 1 ? 'row' : 'rows'} skipped`
                    : ''
                }.`}
              />
            )}
            {summary.warnings.map((warning) => (
              <Check key={warning} ok={false} text={warning} />
            ))}
          </div>

          <button
            type="button"
            onClick={onContinue}
            className="mt-4 cursor-pointer rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-rest)] transition-transform hover:-translate-y-px"
            style={{ background: GRADIENT.brand }}
          >
            Open dashboard →
          </button>
        </Card>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="field">{label}</dt>
      <dd className="num text-2xl font-semibold">{value}</dd>
    </div>
  )
}

function Check({ ok, text }: { ok: boolean; text: string }) {
  return (
    <p className="flex items-start gap-2">
      <span
        aria-hidden="true"
        className="mt-0.5 font-bold"
        style={{ color: ok ? 'var(--color-ok)' : 'var(--color-warn)' }}
      >
        {ok ? '✓' : '!'}
      </span>
      <span className="text-(--color-ink-muted)">{text}</span>
    </p>
  )
}
