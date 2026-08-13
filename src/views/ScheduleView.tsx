import { useMemo, useState } from 'react'
import { NoElementData } from '@/components/NoElementData'
import { Card } from '@/components/Card'
import { IconSearch } from '@/components/icons'
import { COPY } from '@/config/copy'
import { PRIORITY_BANDS } from '@/config/process'
import { PRIORITY_COLOR } from '@/config/theme'
import { formatAvailability } from '@/lib/format'
import { priorityKey } from '@/lib/parseWorkbook'
import { formatWeek, weekSortKey } from '@/lib/weeks'
import type { Project } from '@/types/domain'

interface ScheduleViewProps {
  project: Project
}

type SortKey = 'item' | 'qty' | 'callOff' | 'mould' | 'week' | 'priority'

/**
 * Level 4 — the detailed schedule.
 *
 * Individual products against their production weeks and delivery grouping.
 * Deliberately separate from the raw-data view: this one is read by a
 * production manager, that one exists to prove where a number came from.
 */
export function ScheduleView({ project }: ScheduleViewProps) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('week')
  const [ascending, setAscending] = useState(true)

  const hasPriority = useMemo(
    () => project.rows.some((row) => row.priority !== null),
    [project.rows],
  )

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
        case 'priority':
          return ((a.priority ?? 99) - (b.priority ?? 99)) * direction
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
        <h1 className="text-2xl font-bold tracking-tight">Detailed schedule</h1>
        <p className="mt-0.5 text-sm text-(--color-ink-muted)">
          Individual products against their production weeks, mould and call-off.
        </p>
      </header>

      {project.rows.length === 0 ? (
        <NoElementData project={project} what="The detailed schedule" />
      ) : (
        <Card
          title="Schedule"
          subtitle={`${rows.length} of ${project.rows.length} entries`}
          actions={
            <div className="relative">
              <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-(--color-ink-faint)" />
              <label htmlFor="schedule-search" className="sr-only">
                Search items, moulds or weeks
              </label>
              <input
                id="schedule-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search item, mould, week…"
                className="min-h-11 w-full max-w-56 rounded-xl bg-(--color-surface-sunken) pr-3 pl-8 text-xs transition-shadow hover:shadow-[var(--shadow-rest)] focus:shadow-[var(--shadow-rest)]"
              />
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
                  {hasPriority && (
                    <SortableTh
                      label="Priority"
                      active={sortKey === 'priority'}
                      ascending={ascending}
                      onClick={() => toggleSort('priority')}
                    />
                  )}
                  <SortableTh
                    label="Mould"
                    active={sortKey === 'mould'}
                    ascending={ascending}
                    onClick={() => toggleSort('mould')}
                  />
                  <th scope="col">Mould available</th>
                  <SortableTh
                    label="Production weeks"
                    active={sortKey === 'week'}
                    ascending={ascending}
                    onClick={() => toggleSort('week')}
                  />
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
                    {hasPriority && (
                      <td>
                        {row.priority === null ? (
                          <span className="text-(--color-ink-faint)">—</span>
                        ) : (
                          <span
                            className="chip"
                            style={{
                              backgroundColor: `${PRIORITY_COLOR[priorityKey(row.priority)]}1A`,
                              color: PRIORITY_COLOR[priorityKey(row.priority)],
                            }}
                          >
                            {row.priority} ·{' '}
                            {PRIORITY_BANDS.find((b) => (row.priority ?? 99) <= b.max)
                              ?.label ?? 'Normal'}
                          </span>
                        )}
                      </td>
                    )}
                    <td className="text-(--color-ink-muted)">{row.mould ?? '—'}</td>
                    <td className="text-(--color-ink-muted)">
                      {formatAvailability(row.availability)}
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

      <p className="text-[11px] text-(--color-ink-faint)">
        Source: {project.source} · {COPY.dataCurrencyPrefix} {project.dataAsOf}
      </p>
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
        className={`inline-flex min-h-11 cursor-pointer items-center gap-1 hover:text-(--color-primary) ${
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
