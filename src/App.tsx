import { useEffect, useState } from 'react'
import { BootScreen } from '@/components/BootScreen'
import { SkeletonReport } from '@/components/Skeleton'
import { StatusPill } from '@/components/StatusPill'
import {
  IconChevronRight,
  IconGauge,
  IconMould,
  IconReport,
  IconTable,
  IconTimeline,
  IconUpload,
} from '@/components/icons'
import { COPY } from '@/config/copy'
import { GRADIENT, PALETTE } from '@/config/theme'
import { HIRSLANDENKLINIK } from '@/data/projects'
import { useProjectAnalysis } from '@/hooks/useProjectAnalysis'
import { prefersReducedMotion } from '@/lib/motion'
import { ExportReportView } from '@/views/ExportReportView'
import { IntakeView } from '@/views/IntakeView'
import { MouldReadinessView } from '@/views/MouldReadinessView'
import { OverviewView } from '@/views/OverviewView'
import { PortfolioView } from '@/views/PortfolioView'
import { ProductionPlanView } from '@/views/ProductionPlanView'
import { ProjectDetailsView } from '@/views/ProjectDetailsView'
import type { Project } from '@/types/domain'

type ViewId =
  | 'portfolio'
  | 'intake'
  | 'overview'
  | 'plan'
  | 'moulds'
  | 'details'
  | 'export'

interface NavItem {
  id: ViewId
  label: string
  hint: string
  icon: typeof IconGauge
  /** Tier in the information hierarchy, shown in the rail. */
  level?: string
}

/**
 * Report pages, ordered by the hierarchy the brief specifies: executive glance,
 * then production, then moulds, then detail, then output. The rail preserves
 * that order so the drill path always runs the same direction — down.
 */
const REPORT_PAGES: NavItem[] = [
  { id: 'overview', label: 'Overview', hint: 'Executive glance', icon: IconGauge, level: 'L1' },
  { id: 'plan', label: 'Production plan', hint: 'What, when, how much', icon: IconTimeline, level: 'L2' },
  { id: 'moulds', label: 'Mould readiness', hint: 'Tooling and risk', icon: IconMould, level: 'L3' },
  { id: 'details', label: 'Detail', hint: 'Schedule and raw rows', icon: IconTable, level: 'L4' },
  { id: 'export', label: 'Report', hint: 'Customer PDF', icon: IconReport },
]

/** How long a page shows skeletons when opened. */
const PAGE_SETTLE_MS = 260

export default function App() {
  const [booting, setBooting] = useState(true)
  const [view, setView] = useState<ViewId>('portfolio')
  const [project, setProject] = useState<Project>(HIRSLANDENKLINIK)
  const [settling, setSettling] = useState(false)
  const analysis = useProjectAnalysis(project)

  const inReport = view !== 'portfolio' && view !== 'intake'
  const activePage = REPORT_PAGES.find((page) => page.id === view)

  /**
   * Opening a project shows its skeleton briefly before the canvas resolves.
   * The derivation itself is synchronous — this paces the reveal so the eye is
   * not asked to parse five charts appearing at once.
   */
  const openProject = (next: Project) => {
    setProject(next)
    setView('overview')
    if (!prefersReducedMotion()) setSettling(true)
  }

  useEffect(() => {
    if (!settling) return
    const id = window.setTimeout(() => setSettling(false), PAGE_SETTLE_MS)
    return () => window.clearTimeout(id)
  }, [settling])

  if (booting) return <BootScreen onDone={() => setBooting(false)} />

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar
        project={project}
        crumbs={[
          { label: 'Portfolio', onClick: () => setView('portfolio') },
          ...(inReport ? [{ label: project.name }] : []),
          ...(activePage ? [{ label: activePage.label }] : []),
          ...(view === 'intake' ? [{ label: 'Import data' }] : []),
        ]}
        onImport={() => setView('intake')}
      />

      <div className="flex min-h-0 flex-1">
        {inReport && <Rail active={view} onSelect={setView} level={analysis.level} />}

        <main className="min-w-0 flex-1">
          <div
            className={
              view === 'portfolio' || view === 'intake'
                ? 'mx-auto max-w-6xl px-5 py-6 sm:px-6'
                : 'px-4 py-5 sm:px-6'
            }
          >
            {settling ? (
              <SkeletonReport />
            ) : (
              <>
                {view === 'portfolio' && <PortfolioView onOpen={openProject} />}

                {view === 'intake' && (
                  <IntakeView
                    project={project}
                    onImported={setProject}
                    onContinue={() => setView('overview')}
                  />
                )}

                {view === 'overview' && (
                  <OverviewView project={project} analysis={analysis} />
                )}

                {view === 'plan' && (
                  <ProductionPlanView project={project} analysis={analysis} />
                )}

                {view === 'moulds' && (
                  <MouldReadinessView project={project} analysis={analysis} />
                )}

                {view === 'details' && <ProjectDetailsView project={project} />}

                {view === 'export' && (
                  <ExportReportView project={project} analysis={analysis} />
                )}
              </>
            )}
          </div>
        </main>
      </div>

      <footer className="no-print px-6 py-4">
        <p className="text-[11px] text-(--color-ink-faint)">
          {COPY.footer} · Excel remains the operational source; this dashboard is
          the intelligence and presentation layer.
        </p>
      </footer>
    </div>
  )
}

interface Crumb {
  label: string
  onClick?: () => void
}

/**
 * Frosted top bar.
 *
 * Translucent rather than solid so content scrolling beneath stays faintly
 * visible — the cue that tells you the page is still there, not replaced.
 */
function TopBar({
  project,
  crumbs,
  onImport,
}: {
  project: Project
  crumbs: Crumb[]
  onImport: () => void
}) {
  return (
    <header className="no-print frosted sticky top-0 z-30">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="grid h-8 w-8 place-items-center rounded-xl text-sm font-bold text-white"
            style={{ background: GRADIENT.brand }}
          >
            P
          </span>
          <span className="text-[15px] font-bold tracking-tight">POLYCON</span>
        </div>

        {/* The hierarchy is four levels deep, so location must be explicit. */}
        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="flex items-center gap-0.5 text-[13px]">
            {crumbs.map((crumb, index) => (
              <li key={crumb.label} className="flex items-center gap-0.5">
                {index > 0 && (
                  <IconChevronRight
                    className="shrink-0 text-(--color-ink-faint)/50"
                    size={13}
                  />
                )}
                {crumb.onClick && index < crumbs.length - 1 ? (
                  <button
                    type="button"
                    onClick={crumb.onClick}
                    className="cursor-pointer rounded-lg px-2 py-1 text-(--color-ink-muted) transition-colors hover:bg-white/70 hover:text-(--color-ink)"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span
                    aria-current={index === crumbs.length - 1 ? 'page' : undefined}
                    className={
                      index === crumbs.length - 1
                        ? 'px-2 font-semibold text-(--color-ink)'
                        : 'px-2 text-(--color-ink-muted)'
                    }
                  >
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right lg:block">
            <p className="text-[11px] text-(--color-ink-muted)">
              {COPY.dataCurrencyPrefix}{' '}
              <span className="num font-semibold text-(--color-ink)">
                {project.dataAsOf}
              </span>
            </p>
            <p className="max-w-64 truncate text-[10px] text-(--color-ink-faint)">
              {project.source}
            </p>
          </div>
          <button
            type="button"
            onClick={onImport}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold text-white shadow-[var(--shadow-rest)] transition-transform hover:-translate-y-px"
            style={{ background: GRADIENT.brand }}
          >
            <IconUpload size={15} />
            <span className="hidden sm:inline">Import data</span>
          </button>
        </div>
      </div>
    </header>
  )
}

/**
 * Report page rail.
 *
 * Persistent and always in the same place, so moving between levels never costs
 * orientation. Labels sit beside icons — an icon-only rail would make
 * "Production plan" and "Mould readiness" guesswork.
 */
function Rail({
  active,
  onSelect,
  level,
}: {
  active: ViewId
  onSelect: (id: ViewId) => void
  level: Parameters<typeof StatusPill>[0]['level']
}) {
  return (
    <nav
      aria-label="Report pages"
      className="no-print hidden w-56 shrink-0 px-3 py-5 md:block"
    >
      <div className="sticky top-20">
        <p className="field px-3 pb-2">Report pages</p>

        <ul className="space-y-1">
          {REPORT_PAGES.map((page) => {
            const Icon = page.icon
            const isActive = active === page.id

            return (
              <li key={page.id}>
                <button
                  type="button"
                  onClick={() => onSelect(page.id)}
                  aria-current={isActive ? 'page' : undefined}
                  title={page.hint}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] transition-all ${
                    isActive
                      ? 'font-semibold text-white shadow-[var(--shadow-rest)]'
                      : 'font-medium text-(--color-ink-muted) hover:bg-white/70 hover:text-(--color-ink)'
                  }`}
                  style={isActive ? { background: GRADIENT.brand } : undefined}
                >
                  <Icon size={17} className="shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{page.label}</span>
                  {page.level && (
                    // Decorative: folding the tier into the accessible name
                    // would have screen readers announce "Production plan L2".
                    <span
                      aria-hidden="true"
                      className="num text-[10px]"
                      style={{
                        color: isActive ? 'rgba(255,255,255,0.7)' : PALETTE.inkFaint,
                      }}
                    >
                      {page.level}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        <div className="mt-5 rounded-xl bg-white/70 px-3 py-3">
          <p className="field mb-2">Project status</p>
          <StatusPill level={level} size="md" />
        </div>
      </div>
    </nav>
  )
}
