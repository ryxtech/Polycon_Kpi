import { Card } from '@/components/Card'
import { KpiTile } from '@/components/KpiTile'
import { StatusPill } from '@/components/StatusPill'
import {
  IconAlert,
  IconChevronRight,
  IconCube,
  IconGrid,
  IconStack,
} from '@/components/icons'
import { COPY } from '@/config/copy'
import { GRADIENT, PALETTE, STATUS_COLOR, STATUS_TEXT } from '@/config/theme'
import { PROJECTS } from '@/data/projects'
import { analyseProject } from '@/hooks/useProjectAnalysis'
import { stagger } from '@/lib/motion'
import { formatWeek } from '@/lib/weeks'
import type { Project } from '@/types/domain'

interface PortfolioViewProps {
  onOpen: (project: Project) => void
}

/**
 * Landing screen: every active project and where each one stands.
 *
 * Projects are cards rather than table rows — at two or three projects a card
 * carries more at a glance, and the whole point of this screen is choosing one.
 */
export function PortfolioView({ onOpen }: PortfolioViewProps) {
  const entries = PROJECTS.map((project) => ({
    project,
    analysis: analyseProject(project),
  }))

  const totalPieces = entries.reduce((sum, e) => sum + e.analysis.kpis.totalPieces, 0)
  const totalItems = entries.reduce((sum, e) => sum + e.analysis.kpis.uniqueItems, 0)
  const totalMoulds = entries.reduce((sum, e) => sum + e.analysis.kpis.mouldCount, 0)
  const atRisk = entries.filter((e) => e.analysis.level !== 'on-schedule').length

  return (
    <div className="space-y-5">
      <header className="rise">
        <h1 className="text-2xl font-bold tracking-tight">Project portfolio</h1>
        <p className="mt-0.5 text-sm text-(--color-ink-muted)">
          Active precast projects for GFT Fassaden. Select a project to open its
          report.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          index={0}
          label="Projects"
          value={String(entries.length)}
          icon={<IconGrid size={17} />}
        />
        <KpiTile
          index={1}
          label="Total pieces"
          value={String(totalPieces)}
          icon={<IconStack size={17} />}
        />
        <KpiTile
          index={2}
          label="Total products"
          value={String(totalItems)}
          icon={<IconCube size={17} />}
        />
        <KpiTile
          index={3}
          label="Projects at risk"
          value={String(atRisk)}
          accent={atRisk > 0 ? PALETTE.accent : PALETTE.primary}
          icon={<IconAlert size={17} />}
          caption={`${totalMoulds} moulds in total`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {entries.map(({ project, analysis }, index) => {
          const open = analysis.findings.filter(
            (f) => f.level !== 'on-schedule',
          ).length
          const readyRatio =
            analysis.kpis.mouldCount === 0
              ? 0
              : analysis.kpis.mouldsReady / analysis.kpis.mouldCount

          return (
            <button
              key={project.id}
              type="button"
              onClick={() => onOpen(project)}
              className="card card-interactive rise p-5 text-left"
              style={stagger(index + 4)}
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-base font-bold text-white"
                  style={{ background: GRADIENT.brand }}
                >
                  {project.name.slice(0, 2).toUpperCase()}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold tracking-tight">
                      {project.name}
                    </h2>
                    <StatusPill level={analysis.level} />
                  </div>
                  <p className="mt-0.5 text-xs text-(--color-ink-faint)">
                    {project.client} · {COPY.dataCurrencyPrefix} {project.dataAsOf}
                  </p>
                </div>

                <IconChevronRight className="mt-1 shrink-0 text-(--color-ink-faint)" />
              </div>

              <dl className="mt-4 grid grid-cols-4 gap-3">
                <Metric label="Pieces" value={String(analysis.kpis.totalPieces)} />
                <Metric label="Products" value={String(analysis.kpis.uniqueItems)} />
                <Metric
                  label="Next week"
                  value={
                    analysis.kpis.nextProductionWeek
                      ? formatWeek(analysis.kpis.nextProductionWeek)
                      : '—'
                  }
                />
                <Metric
                  label="Open"
                  value={String(open)}
                  color={open > 0 ? STATUS_TEXT[analysis.level] : undefined}
                />
              </dl>

              <div className="mt-4">
                <div className="flex items-baseline justify-between text-[11px]">
                  <span className="text-(--color-ink-faint)">Moulds ready</span>
                  <span className="num font-semibold">
                    {analysis.kpis.mouldsReady}/{analysis.kpis.mouldCount}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-(--color-surface-sunken)">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${readyRatio * 100}%`,
                      backgroundColor: STATUS_COLOR['on-schedule'],
                    }}
                  />
                </div>
              </div>

              <p className="mt-3 truncate text-[10px] text-(--color-ink-faint)">
                {project.source}
              </p>
            </button>
          )
        })}
      </div>

      <Card index={6} className="bg-transparent shadow-none">
        <p className="text-xs leading-relaxed text-(--color-ink-faint)">
          Progress percentages are absent by design — neither source carries a
          completed-quantity field. {COPY.completionPending}
        </p>
      </Card>
    </div>
  )
}

function Metric({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <div className="rounded-xl bg-(--color-surface-alt) px-2.5 py-2">
      <dt className="text-[10px] text-(--color-ink-faint)">{label}</dt>
      <dd className="num mt-0.5 text-base font-bold" style={{ color }}>
        {value}
      </dd>
    </div>
  )
}
