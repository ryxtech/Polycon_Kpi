import { useMemo, useState } from 'react'
import { NoElementData } from '@/components/NoElementData'
import { Card } from '@/components/Card'
import { IconSearch } from '@/components/icons'
import { COPY } from '@/config/copy'
import { formatAvailability } from '@/lib/format'
import { formatWeek } from '@/lib/weeks'
import type { Project } from '@/types/domain'

interface RawDataViewProps {
  project: Project
}

/**
 * Level 5 — the Excel-derived table.
 *
 * Exists to answer "where did that number come from". Every column is shown as
 * parsed, and the original `PRODUCTION (WEEK)` text sits beside the weeks it
 * was interpreted as — so a disagreement between source and reading is visible
 * rather than buried.
 */
export function RawDataView({ project }: RawDataViewProps) {
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return project.rows
    return project.rows.filter(
      (row) =>
        row.item.toLowerCase().includes(needle) ||
        (row.mould ?? '').toLowerCase().includes(needle) ||
        row.weeksRaw.toLowerCase().includes(needle),
    )
  }, [project.rows, query])

  return (
    <div className="space-y-4">
      <header className="rise">
        <h1 className="text-2xl font-bold tracking-tight">Raw data</h1>
        <p className="mt-0.5 text-sm text-(--color-ink-muted)">
          Every row exactly as parsed from the source, with the original week
          text kept beside the interpreted weeks.
        </p>
      </header>

      {project.rows.length === 0 ? (
        <NoElementData project={project} what="The raw data table" />
      ) : (
        <Card
          title="Parsed rows"
          subtitle={`${project.source} · ${COPY.dataCurrencyPrefix} ${project.dataAsOf}`}
          actions={
            <div className="flex items-center gap-2">
              <div className="relative">
                <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-(--color-ink-faint)" />
                <label htmlFor="raw-search" className="sr-only">
                  Search items, moulds or weeks
                </label>
                <input
                  id="raw-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search…"
                  className="min-h-11 w-full max-w-44 rounded-xl bg-(--color-surface-sunken) pr-3 pl-8 text-xs transition-shadow hover:shadow-[var(--shadow-rest)] focus:shadow-[var(--shadow-rest)]"
                />
              </div>
              <span className="num text-[11px] whitespace-nowrap text-(--color-ink-faint)">
                {rows.length}/{project.rows.length}
              </span>
            </div>
          }
          flush
        >
          <div className="max-h-[34rem] overflow-auto">
            <table className="data-grid">
              <thead>
                <tr>
                  <th scope="col">ITEM</th>
                  <th scope="col" className="text-right">QTY</th>
                  <th scope="col" className="text-right">CALL OFF</th>
                  <th scope="col">MOLD DESIGNATION</th>
                  <th scope="col">MOLD WILL BE DONE</th>
                  <th scope="col">PRODUCTION (WEEK)</th>
                  <th scope="col">Interpreted as</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.item}-${row.callOff}-${index}`}>
                    <td className="font-medium">{row.item}</td>
                    <td className="num text-right">{row.qty}</td>
                    <td className="num text-right text-(--color-ink-muted)">
                      {row.callOff ?? '—'}
                    </td>
                    <td className="text-(--color-ink-muted)">{row.mould ?? '—'}</td>
                    <td className="text-(--color-ink-muted)">
                      {formatAvailability(row.availability)}
                    </td>
                    <td className="num text-(--color-ink-faint)">
                      {row.weeksRaw || '—'}
                    </td>
                    <td className="num text-(--color-ink-muted)">
                      {row.weeks.length > 0 ? row.weeks.map(formatWeek).join(' ') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {rows.length === 0 && (
              <p className="p-4 text-xs text-(--color-ink-muted)">
                Nothing matches “{query}”.
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
