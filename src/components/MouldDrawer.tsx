import { useEffect, useRef } from 'react'
import { GRADIENT, STATUS_COLOR } from '@/config/theme'
import { formatAvailability, toWorkingDaysLabel } from '@/lib/format'
import { formatWeek, formatWeekLong } from '@/lib/weeks'
import type { MouldSummary } from '@/types/domain'
import { StatusPill } from './StatusPill'
import { IconClose } from './icons'

interface MouldDrawerProps {
  mould: MouldSummary | null
  onClose: () => void
}

/** Drill-through for one mould: what it makes, when, and how much slack it has. */
export function MouldDrawer({ mould, onClose }: MouldDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!mould) return

    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [mould, onClose])

  if (!mould) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Scrim strong enough to isolate the panel from the canvas behind it. */}
      <button
        type="button"
        aria-label="Close mould detail"
        className="absolute inset-0 cursor-pointer bg-(--color-ink)/35 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="mould-drawer-title"
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-(--color-surface) shadow-[var(--shadow-float)] sm:rounded-l-[24px]"
      >
        <header className="flex items-start justify-between gap-4 px-5 py-4 text-white sm:rounded-tl-[24px]"
          style={{ background: GRADIENT.brand }}>
          <div>
            <p className="text-[10px] font-semibold tracking-[0.12em] text-white/50 uppercase">
              Mould detail
            </p>
            <h2 id="mould-drawer-title" className="num mt-0.5 text-xl font-semibold">
              {mould.name}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-lg p-1.5 text-white/80 hover:bg-white/15 hover:text-white"
          >
            <IconClose />
          </button>
        </header>

        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-2">
            <Figure label="Pieces" value={String(mould.totalQty)} mono />
            <Figure label="Products" value={String(mould.itemCount)} mono />
            <Figure label="Entries" value={String(mould.scheduledRows)} mono />
            <Figure label="Available" value={formatAvailability(mould.availability)} />
          </div>

          <section>
            <h3 className="field mb-1.5">Status</h3>
            <StatusPill level={mould.status} size="md" />
            <p className="mt-1.5 text-xs leading-relaxed text-(--color-ink-muted)">
              {mould.bufferDays === null
                ? 'No readiness date recorded, so the buffer cannot be calculated.'
                : `${toWorkingDaysLabel(mould.bufferDays)} between this mould becoming available and the start of its first production week.`}
            </p>
          </section>

          <section>
            <h3 className="field mb-1.5">Production window</h3>
            {mould.firstWeek && mould.lastWeek ? (
              <>
                <p className="num text-sm font-semibold">
                  {formatWeek(mould.firstWeek)} → {formatWeek(mould.lastWeek)}
                </p>
                <p className="mt-0.5 text-xs text-(--color-ink-muted)">
                  Starts {formatWeekLong(mould.firstWeek)}
                </p>
              </>
            ) : (
              <p className="text-xs text-(--color-ink-muted)">Not scheduled.</p>
            )}
          </section>

          <section>
            <div className="mb-1.5 flex items-baseline justify-between">
              <h3 className="field">Products using this mould</h3>
              <span className="num text-[11px] text-(--color-ink-faint)">
                {mould.items.length}
              </span>
            </div>
            <ul className="max-h-80 overflow-y-auto rounded-xl bg-(--color-surface-alt) p-1">
              {mould.items.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs hover:bg-white"
                >
                  <span
                    aria-hidden="true"
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: STATUS_COLOR[mould.status] }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </aside>
    </div>
  )
}

function Figure({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="rounded-xl bg-(--color-surface-alt) px-3 py-2.5">
      <p className="field">{label}</p>
      <p className={`mt-0.5 text-base font-semibold ${mono ? 'num' : 'text-sm'}`}>
        {value}
      </p>
    </div>
  )
}
