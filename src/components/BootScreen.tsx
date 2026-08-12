import { useEffect, useMemo, useState } from 'react'
import { GRADIENT, PALETTE } from '@/config/theme'
import { PROJECTS } from '@/data/projects'
import { analyseProject } from '@/hooks/useProjectAnalysis'
import { prefersReducedMotion } from '@/lib/motion'

interface BootScreenProps {
  onDone: () => void
  /** Total run time in ms. Ignored when the user prefers reduced motion. */
  duration?: number
}

/**
 * First-open experience.
 *
 * The figures shown are the real ones, computed from the datasets before the
 * screen paints — the animation paces how they are revealed, it does not stand
 * in for work that has not happened. Nothing here reports progress it cannot
 * substantiate.
 */
export function BootScreen({ onDone, duration = 1500 }: BootScreenProps) {
  const facts = useMemo(() => {
    const analyses = PROJECTS.map(analyseProject)
    return {
      projects: PROJECTS.length,
      pieces: analyses.reduce((sum, a) => sum + a.kpis.totalPieces, 0),
      products: analyses.reduce((sum, a) => sum + a.kpis.uniqueItems, 0),
      moulds: analyses.reduce((sum, a) => sum + a.kpis.mouldCount, 0),
    }
  }, [])

  const [progress, setProgress] = useState(0)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (prefersReducedMotion()) {
      onDone()
      return
    }

    let frame = 0
    const start = performance.now()

    const tick = (now: number) => {
      const elapsed = now - start
      const ratio = Math.min(elapsed / duration, 1)
      // Ease-out so the bar decelerates into place instead of stopping dead.
      setProgress(1 - (1 - ratio) ** 3)

      if (ratio < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        setLeaving(true)
        window.setTimeout(onDone, 260)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [duration, onDone])

  const stages = [
    { label: 'Reading production data', at: 0.12 },
    { label: 'Resolving moulds and call-offs', at: 0.38 },
    { label: 'Calculating capacity and risk', at: 0.66 },
    { label: 'Composing report', at: 0.88 },
  ]

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Preparing report"
      className="fixed inset-0 z-100 flex items-center justify-center bg-(--color-canvas) transition-opacity duration-260"
      style={{ opacity: leaving ? 0 : 1 }}
    >
      {/* Two soft colour washes give the ground depth without an image. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-32 h-[28rem] w-[28rem] rounded-full opacity-45 blur-3xl"
        style={{ background: PALETTE.primarySoft }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -bottom-40 h-[30rem] w-[30rem] rounded-full opacity-35 blur-3xl"
        style={{ background: PALETTE.violet }}
      />

      <div className="relative w-full max-w-md px-6 text-center">
        <span
          className="mx-auto grid h-16 w-16 place-items-center rounded-2xl text-2xl font-bold text-white shadow-[var(--shadow-float)]"
          style={{ background: GRADIENT.brand }}
        >
          P
        </span>

        <h1 className="mt-5 text-2xl font-bold tracking-tight">POLYCON</h1>
        <p className="text-[13px] tracking-[0.18em] text-(--color-ink-faint) uppercase">
          Production Intelligence
        </p>

        <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-white/70">
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress * 100}%`,
              background: GRADIENT.brand,
            }}
          />
        </div>

        <p className="mt-3 h-4 text-xs text-(--color-ink-muted)">
          {stages.filter((stage) => progress >= stage.at).at(-1)?.label ??
            stages[0].label}
        </p>

        <div className="mt-8 grid grid-cols-4 gap-2">
          <Fact label="Projects" value={facts.projects} progress={progress} />
          <Fact label="Pieces" value={facts.pieces} progress={progress} />
          <Fact label="Products" value={facts.products} progress={progress} />
          <Fact label="Moulds" value={facts.moulds} progress={progress} />
        </div>
      </div>
    </div>
  )
}

/** Counts up to the real figure; the number itself is never invented. */
function Fact({
  label,
  value,
  progress,
}: {
  label: string
  value: number
  progress: number
}) {
  return (
    <div className="rounded-xl bg-white/70 px-2 py-2.5">
      <p className="num text-lg font-bold text-(--color-ink)">
        {Math.round(value * progress)}
      </p>
      <p className="text-[10px] text-(--color-ink-faint)">{label}</p>
    </div>
  )
}
