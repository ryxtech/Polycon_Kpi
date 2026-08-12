import { useRef, useState } from 'react'
import { Card } from '@/components/Card'
import { IconUpload } from '@/components/icons'
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

interface ImportSummary {
  fileName: string
  rowCount: number
  pieces: number
  items: number
  moulds: number
  callOffs: number
  hasProductionFlag: boolean
  productionFlagHeader: string | null
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
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setBusy(true)
    setError(null)

    try {
      const buffer = await file.arrayBuffer()
      const result = await parseWorkbook(buffer, HIRSLANDEN_BASE_YEAR)

      if (result.rows.length === 0) {
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

      const analysis = analyseProject(imported)

      setSummary({
        fileName: file.name,
        rowCount: result.rows.length,
        pieces: analysis.kpis.totalPieces,
        items: analysis.kpis.uniqueItems,
        moulds: analysis.kpis.mouldCount,
        callOffs: analysis.kpis.callOffCount,
        hasProductionFlag: result.hasProductionFlag,
        productionFlagHeader: result.productionFlagHeader,
        warnings: result.warnings,
      })

      onImported(imported)
    } catch {
      setError('That file could not be read as a spreadsheet.')
      setSummary(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
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
