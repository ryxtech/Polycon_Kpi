import { STATUS_COLOR, STATUS_TEXT } from '@/config/theme'
import { formatPieces } from '@/lib/format'
import { prefersReducedMotion } from '@/lib/motion'
import {
  explainCapacity,
  headroomPieces,
  overagePieces,
  summariseWeek,
  type WeekDetail,
} from '@/lib/weekDetail'
import { formatDate } from '@/lib/weeks'
import { IconClose } from './icons'

interface WeekDetailPanelProps {
  detail: WeekDetail
  onClose: () => void
}

/** Verdicts map onto the same three states used everywhere else in the report. */
const STATUS_KEY = {
  over: 'critical',
  tight: 'limited-buffer',
  ok: 'on-schedule',
} as const

/**
 * What is inside one week.
 *
 * Selecting a bar used to filter the rest of the report and nothing more, which
 * answered a question nobody had asked: the reader who clicks W36 wants to know
 * what is in W36, not to see other pages quietly change. This answers that
 * directly, and in the order the question is actually asked — the verdict, then
 * the arithmetic behind it, then the moulds, then the products.
 */
export function WeekDetailPanel({ detail, onClose }: WeekDetailPanelProps) {
  const status = STATUS_KEY[detail.verdict]
  const reduced = prefersReducedMotion()

  return (
    <section
      aria-label={`Week ${detail.week.week} detail`}
      className="mt-4 overflow-hidden rounded-2xl border-t-2 bg-(--color-surface-sunken)"
      style={{
        borderTopColor: STATUS_COLOR[status],
        animation: reduced ? undefined : 'reveal 260ms cubic-bezier(0.22,1,0.36,1) both',
      }}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 px-4 pt-3.5 pb-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2.5">
            <h3 className="num text-[17px] font-bold tracking-tight">
              Week {detail.week.week}
            </h3>
            <span className="num text-xs text-(--color-ink-muted)">
              {formatDate(detail.start)} – {formatDate(detail.workingEnd)}
            </span>
          </div>
          <p
            className="mt-1 text-sm font-semibold"
            style={{ color: STATUS_TEXT[status] }}
          >
            {summariseWeek(detail)}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold text-(--color-ink-muted) transition-colors hover:bg-(--color-surface) hover:text-(--color-ink)"
        >
          <IconClose size={14} />
          Close
        </button>
      </header>

      <div className="grid gap-3 px-4 pb-4 md:grid-cols-3">
        <Figure label="Planned" value={formatPieces(detail.pieces)} unit="pcs" />
        <Figure
          label="Capacity"
          value={String(detail.capacity)}
          unit="pcs"
          note={explainCapacity(detail)}
        />
        <Figure
          label={detail.verdict === 'over' ? 'Short by' : 'Headroom'}
          value={
            detail.verdict === 'over'
              ? String(overagePieces(detail))
              : String(headroomPieces(detail))
          }
          unit="pcs"
          tone={detail.verdict === 'over' ? STATUS_TEXT.critical : undefined}
        />
      </div>

      {detail.moulds.length > 0 && (
        <div className="px-4 pb-4">
          <h4 className="field mb-2">
            Moulds running this week · {detail.mouldCount}
          </h4>
          <ul className="space-y-1.5">
            {detail.moulds.map((mould) => {
              const over = mould.pieces > mould.capacity
              const fill = Math.min((mould.pieces / mould.capacity) * 100, 100)
              return (
                <li key={mould.name} className="flex items-center gap-3">
                  <span className="num w-16 shrink-0 text-xs font-semibold">
                    {mould.name}
                  </span>
                  <span
                    className="relative h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-(--color-surface)"
                    aria-hidden="true"
                  >
                    <span
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${fill}%`,
                        backgroundColor: over
                          ? STATUS_COLOR.critical
                          : STATUS_COLOR['on-schedule'],
                      }}
                    />
                  </span>
                  <span className="num w-24 shrink-0 text-right text-xs text-(--color-ink-muted)">
                    {formatPieces(mould.pieces)} / {mould.capacity} pcs
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="field mt-2">
            Each mould makes one piece per working day — five a week.
          </p>
        </div>
      )}

      <div className="px-4 pb-4">
        <h4 className="field mb-2">
          Products scheduled this week · {detail.items.length}
        </h4>
        {/*
          Scrolls in both directions. At phone widths four columns cannot share
          375px, and letting them try broke item codes like "SL-300 FP AD 02"
          across four lines — the column is the identifier, so it must stay on
          one line and the table must move under it instead.
        */}
        <div className="max-h-64 overflow-auto rounded-xl bg-(--color-surface)">
          <table className="data-grid w-full min-w-[25rem]">
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Mould</th>
                <th scope="col">Call-off</th>
                <th scope="col" className="text-right">
                  Pieces
                </th>
              </tr>
            </thead>
            <tbody>
              {detail.items.map((item) => (
                <tr key={`${item.item}-${item.mould ?? 'none'}`}>
                  <td className="font-medium whitespace-nowrap">{item.item}</td>
                  <td className="num">{item.mould ?? '—'}</td>
                  <td className="num">
                    {item.callOff === null
                      ? '—'
                      : String(item.callOff).padStart(2, '0')}
                  </td>
                  <td className="num text-right">
                    {formatPieces(item.pieces)}
                    {item.spread > 1 && (
                      <span
                        className="ml-1 text-(--color-ink-faint)"
                        title={`${item.totalQty} pcs spread evenly across ${item.spread} weeks`}
                      >
                        of {item.totalQty}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {detail.approximate && (
          <p className="field mt-2">
            Items spanning several weeks are divided evenly between them — the
            sheet gives no week-by-week split.
          </p>
        )}
      </div>

      <style>{`@keyframes reveal { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }`}</style>
    </section>
  )
}


function Figure({
  label,
  value,
  unit,
  note,
  tone,
}: {
  label: string
  value: string
  unit: string
  note?: string
  tone?: string
}) {
  return (
    <div className="rounded-xl bg-(--color-surface) px-3.5 py-3">
      <p className="field">{label}</p>
      <p className="num mt-0.5 text-xl font-bold" style={tone ? { color: tone } : undefined}>
        {value}
        <span className="ml-1 text-xs font-semibold text-(--color-ink-faint)">
          {unit}
        </span>
      </p>
      {note && (
        <p className="mt-1 text-[10px] leading-snug text-(--color-ink-faint)">{note}</p>
      )}
    </div>
  )
}
