import { useEffect, useRef, useState } from 'react'
import { PALETTE, STATUS_TEXT } from '@/config/theme'
import {
  buildShareLink,
  startSharing,
  stopSharing,
  tokenFor,
} from '@/lib/shareLink'
import type { Project } from '@/types/domain'
import { IconClose, IconShare } from './icons'

interface SharePopoverProps {
  project: Project
}

/**
 * Creates, hands over and withdraws the customer link.
 *
 * A popover rather than a modal: sharing is a small, reversible act, and a
 * full-screen dialog implies more ceremony than it deserves. The important
 * control is <em>Stop sharing</em> — a link that cannot be withdrawn is not one
 * anybody should give a customer, because projects end and figures get
 * corrected.
 */
export function SharePopover({ project }: SharePopoverProps) {
  const [open, setOpen] = useState(false)
  const [token, setToken] = useState<string | null>(() => tokenFor(project.id))
  const [copied, setCopied] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const shared = token !== null
  const link =
    token && typeof window !== 'undefined'
      ? buildShareLink(token, window.location.href)
      : ''

  useEffect(() => {
    setToken(tokenFor(project.id))
  }, [project.id])

  useEffect(() => {
    if (!open) return

    const onDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const create = () => setToken(startSharing(project.id))

  const revoke = () => {
    stopSharing(project.id)
    setToken(null)
    setCopied(false)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      // Clipboard access is refused over plain HTTP and in some browsers.
      // Selecting the text lets the user copy by hand rather than leaving them
      // with a button that silently did nothing.
      inputRef.current?.select()
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2200)
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-(--color-surface-sunken) px-5 text-sm font-semibold text-(--color-ink) transition-colors hover:bg-(--color-primary-wash)"
      >
        <IconShare size={16} />
        {shared ? 'Sharing' : 'Share'}
        {shared && (
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: PALETTE.primary }}
          />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Share with customer"
          className="absolute top-13 left-0 z-40 w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl bg-(--color-surface) p-4 shadow-[var(--shadow-float)]"
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[15px] font-bold tracking-tight">
              Share this report
            </h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="cursor-pointer rounded-lg p-1 text-(--color-ink-faint) hover:bg-(--color-surface-sunken) hover:text-(--color-ink)"
            >
              <IconClose size={16} />
            </button>
          </div>

          {shared ? (
            <>
              <div className="mt-3 flex gap-2">
                <input
                  ref={inputRef}
                  readOnly
                  value={link}
                  aria-label="Share link"
                  onFocus={(event) => event.target.select()}
                  className="min-h-10 min-w-0 flex-1 rounded-xl bg-(--color-surface-sunken) px-3 text-xs"
                />
                <button
                  type="button"
                  onClick={copy}
                  className="min-h-10 shrink-0 cursor-pointer rounded-xl px-4 text-[13px] font-semibold text-white"
                  style={{ backgroundColor: PALETTE.ink }}
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              <p className="mt-2.5 text-xs leading-relaxed text-(--color-ink-muted)">
                Anyone with this link can read{' '}
                <strong className="text-(--color-ink)">{project.name}</strong> —
                overview, plan, moulds and schedule. It is not password protected,
                so don't post it publicly. Your other projects and the raw data
                stay private.
              </p>

              <button
                type="button"
                onClick={revoke}
                className="mt-3 min-h-11 w-full cursor-pointer rounded-xl border text-[13px] font-semibold transition-colors"
                style={{
                  borderColor: `${STATUS_TEXT.critical}40`,
                  color: STATUS_TEXT.critical,
                }}
              >
                Stop sharing
              </button>
            </>
          ) : (
            <>
              <p className="mt-2 text-xs leading-relaxed text-(--color-ink-muted)">
                Creates a read-only link to{' '}
                <strong className="text-(--color-ink)">{project.name}</strong>. It
                always shows the latest imported data, so there is nothing to
                re-send when the Excel changes.
              </p>

              <button
                type="button"
                onClick={create}
                className="mt-3 min-h-11 w-full cursor-pointer rounded-xl text-[13px] font-semibold text-white"
                style={{ backgroundColor: PALETTE.ink }}
              >
                Create link
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
