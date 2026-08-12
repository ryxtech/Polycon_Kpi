import { useMemo, useState } from 'react'
import { NoElementData } from '@/components/NoElementData'
import { Card } from '@/components/Card'
import { IconSearch } from '@/components/icons'
import { COPY } from '@/config/copy'
import { formatAvailability } from '@/lib/format'
import { formatWeek, weekSortKey } from '@/lib/weeks'
import type { Project } from '@/types/domain'

interface ProjectDetailsViewProps {
  project: Project
}

type SortKey = 'item' | 'qty' | 'callOff' | 'mould' | 'week'

/** Levels 4 and 5 — the full schedule and the rows it was derived from. */
export function ProjectDetailsView({ project }: ProjectDetailsViewProps) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('item')
  const [ascending, setAscending] = useState(true)

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const matched = needle
      ? project.rows.filter(
          (row) =>
            row.item.toLowerCase().includes(needle) ||
            (row.mould ?? '').toLowerCase().includes(needle) ||
            row.weeksRaw.toLowerCase().includes(needle),
        )
      : project.rows

    const direction = ascending ? 1 : -1

    return [...matched].sort((a, b) => {
      switch (sortKey) {
        case 'qty':
          return (a.qty - b.qty) * direction
        case 'callOff':
          return ((a.callOff ?? 0) - (b.callOff ?? 0)) * direction
        case 'mould':
          return (a.mould ?? '').localeCompare(b.mould ?? '') * direction
        case 'week': {
          const aw = a.weeks[0]
          const bw = b.weeks[0]
          if (!aw || !bw) return 0
          return (weekSortKey(aw) - weekSortKey(bw)) * direction
        }
        default:
          return a.item.localeCompare(b.item) * direction
      }
    })
  }, [project.rows, query, sortKey, ascending])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setAscending((previous) => !previous)
    else {
      setSortKey(key)
      setAscending(true)
    }
  }

  return (
    <div className="space-y-4">
      <header className="rise">
        <h1 className="text-2xl font-bold tracking-tight">Detail</h1>
        <p className="mt-0.5 text-sm text-(--color-ink-muted)">
          Every row as parsed from the source, with the original week text kept
          beside the interpreted weeks.
        </p>
      </header>

      {project.rows.length === 0 ? (
        <NoElementData project={project} what="The detailed row view" />
      ) : (
        <Card
          title="Parsed rows"
          subtitle={`${project.source} · ${COPY.dataCurrencyPrefix} ${project.dataAsOf}`}
          actions={
            <div className="flex items-center gap-2">
              <div className="relative">
                <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-(--color-ink-faint)" />
                <label htmlFor="details-search" className="sr-only">
                  Search items, moulds or weeks
                </label>
                <input
                  id="details-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search item, mould, week…"
                  className="w-56 rounded-xl bg-(--color-surface-sunken) py-2 pr-3 pl-8 text-xs transition-shadow hover:shadow-[var(--shadow-rest)] focus:shadow-[var(--shadow-rest)]"
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
                  <SortableTh
                    label="Item"
                    active={sortKey === 'item'}
                    ascending={ascending}
                    onClick={() => toggleSort('item')}
                  />
                  <SortableTh
                    label="Qty"
                    align="right"
                    active={sortKey === 'qty'}
                    ascending={ascending}
                    onClick={() => toggleSort('qty')}
                  />
                  <SortableTh
                    label="Call-off"
                    align="right"
                    active={sortKey === 'callOff'}
                    ascending={ascending}
                    onClick={() => toggleSort('callOff')}
                  />
                  <SortableTh
                    label="Mould"
                    active={sortKey === 'mould'}
                    ascending={ascending}
                    onClick={() => toggleSort('mould')}
                  />
                  <th scope="col">Mould available</th>
                  <SortableTh
                    label="Weeks"
                    active={sortKey === 'week'}
                    ascending={ascending}
                    onClick={() => toggleSort('week')}
                  />
                  <th scope="col">Source text</th>
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
                    <td className="num text-(--color-ink-muted)">
                      {row.weeks.length > 0 ? row.weeks.map(formatWeek).join(' ') : '—'}
                    </td>
                    <td className="num text-[11px] text-(--color-ink-faint)">
                      {row.weeksRaw || '—'}
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

function SortableTh({
  label,
  align = 'left',
  active,
  ascending,
  onClick,
}: {
  label: string
  align?: 'left' | 'right'
  active: boolean
  ascending: boolean
  onClick: () => void
}) {
  return (
    <th
      scope="col"
      className={align === 'right' ? 'text-right' : 'text-left'}
      aria-sort={active ? (ascending ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex cursor-pointer items-center gap-1 hover:text-(--color-primary) ${
          active ? 'text-(--color-primary)' : ''
        }`}
      >
        {label}
        <span aria-hidden="true" className={active ? '' : 'opacity-25'}>
          {active && !ascending ? '↓' : '↑'}
        </span>
      </button>
    </th>
  )
}
