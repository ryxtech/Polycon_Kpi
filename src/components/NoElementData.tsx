import { Card } from './Card'

interface NoElementDataProps {
  project: { name: string; source: string }
  what: string
}

/**
 * Shown where a view needs element-level rows and the project has none.
 *
 * Beethovenstrasse is documented only by published PDF schedules — its form
 * statuses are authoritative, but there is no per-element workbook behind them.
 * Saying so plainly beats rendering an empty chart that reads as broken, and
 * beats back-filling numbers off a plotted image by a wider margin still.
 */
export function NoElementData({ project, what }: NoElementDataProps) {
  return (
    <Card title={what} subtitle="Requires element-level data">
      <p className="max-w-2xl text-xs leading-relaxed text-(--color-ink-muted)">
        {project.name} is documented by a published form schedule (
        <span className="text-(--color-ink)">{project.source}</span>), which gives
        form status, priority and quantities but no per-element rows. Mould
        readiness and the portfolio figures are driven from it;{' '}
        {what.toLowerCase()} becomes available once an overview workbook exists
        for this project.
      </p>
      <p className="mt-2 border-t border-(--color-gridline) pt-2 text-[11px] text-(--color-ink-faint)">
        No figures have been reconstructed from the plotted schedule — a
        transcribed quantity that disagrees with the published one would be worse
        than none.
      </p>
    </Card>
  )
}
