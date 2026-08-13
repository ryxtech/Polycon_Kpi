import { useState } from 'react'
import { StatusPill } from '@/components/StatusPill'
import {
  IconChevronRight,
  IconGauge,
  IconMould,
  IconReport,
  IconDatabase,
  IconTable,
  IconTimeline,
  IconUpload,
} from '@/components/icons'
import { COPY } from '@/config/copy'
import {
  GRADIENT,
  PALETTE,
  STATUS_TEXT,
  STATUS_WASH,
} from '@/config/theme'
import { HIRSLANDENKLINIK } from '@/data/projects'
import { useProjectAnalysis } from '@/hooks/useProjectAnalysis'
import { ExportReportView } from '@/views/ExportReportView'
import { IntakeView } from '@/views/IntakeView'
import { MouldReadinessView } from '@/views/MouldReadinessView'
import { OverviewView } from '@/views/OverviewView'
import { PortfolioView } from '@/views/PortfolioView'
import { ProductionPlanView } from '@/views/ProductionPlanView'
import { RawDataView } from '@/views/RawDataView'
import { ScheduleView } from '@/views/ScheduleView'
import type { Project } from '@/types/domain'

type ViewId =
  | 'portfolio'
  | 'intake'
  | 'overview'
  | 'plan'
  | 'moulds'
  | 'schedule'
  | 'raw'
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
  { id: 'schedule', label: 'Detailed schedule', hint: 'Products, weeks, delivery', icon: IconTable, level: 'L4' },
  { id: 'raw', label: 'Raw data', hint: 'Excel-derived table', icon: IconDatabase, level: 'L5' },
  { id: 'export', label: 'Report', hint: 'Customer PDF', icon: IconReport },
]

export default function App() {
  const [view, setView] = useState<ViewId>('portfolio')
  const [project, setProject] = useState<Project>(HIRSLANDENKLINIK)
  const analysis = useProjectAnalysis(project)

  const inReport = view !== 'portfolio' && view !== 'intake'
  const activePage = REPORT_PAGES.find((page) => page.id === view)

  const openProject = (next: Project) => {
    setProject(next)
    setView('overview')
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="no-print sticky top-0 z-30">
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

        {inReport && (
          <MobilePageTabs active={view} onSelect={setView} level={analysis.level} />
        )}
      </div>

      <div className="flex min-h-0 flex-1">
        {inReport && <Rail active={view} onSelect={setView} level={analysis.level} />}

        <main className="min-w-0 flex-1">
          {project.specimen && (
            <div className="px-4 pt-5 sm:px-6">
              <SpecimenBanner project={project} />
            </div>
          )}
          <div
            className={
              view === 'portfolio' || view === 'intake'
                ? 'mx-auto max-w-6xl px-5 py-6 sm:px-6'
                : 'px-4 py-5 sm:px-6'
            }
          >
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

            {view === 'schedule' && <ScheduleView project={project} />}

            {view === 'raw' && <RawDataView project={project} />}

            {view === 'export' && (
              <ExportReportView project={project} analysis={analysis} />
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

/**
 * Marks a demonstration dataset on every page it appears on.
 *
 * A specimen that is labelled only in the portfolio is a specimen that will
 * eventually be screenshotted from a detail page and mistaken for a real job.
 */
function SpecimenBanner({ project }: { project: Project }) {
  return (
    <p
      className="rise flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl px-4 py-3 text-[13px]"
      style={{
        backgroundColor: STATUS_WASH['limited-buffer'],
        color: STATUS_TEXT['limited-buffer'],
      }}
    >
      <span className="chip bg-white/70 font-bold">SPECIMEN</span>
      <span className="font-semibold">{project.specimenNote}</span>
    </p>
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
    <header className="frosted">
      <div className="flex items-center gap-3 px-4 py-2.5 sm:gap-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="grid h-8 w-8 place-items-center rounded-xl text-sm font-bold text-white"
            style={{ background: GRADIENT.brand }}
          >
            P
          </span>
          <span className="hidden text-[15px] font-bold tracking-tight sm:inline">
            POLYCON
          </span>
        </div>

        {/* The hierarchy is four levels deep, so location must be explicit. */}
        {/* Absorbs the squeeze: scrolls rather than wrapping the header. */}
        <nav aria-label="Breadcrumb" className="min-w-0 flex-1 overflow-x-auto">
          <ol className="flex items-center gap-0.5 text-[13px] whitespace-nowrap">
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
                    className="inline-flex min-h-11 cursor-pointer items-center rounded-lg px-2 text-(--color-ink-muted) transition-colors hover:bg-white/70 hover:text-(--color-ink)"
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

        <div className="flex shrink-0 items-center gap-3">
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
            <p className="text-[10px] text-(--color-ink-faint)">
              {COPY.nextRefresh}
            </p>
          </div>
          <button
            type="button"
            onClick={onImport}
            className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl px-4 text-[13px] font-semibold text-white shadow-[var(--shadow-rest)] transition-transform hover:-translate-y-px"
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
 * Report pages on phones.
 *
 * The rail is hidden below `md`, so without this the four deeper levels are
 * simply unreachable on a handset — you could open a project and never leave
 * the Overview. A horizontally scrolling strip keeps all five reachable without
 * covering content the way a bottom bar would on a data-dense page.
 */
function MobilePageTabs({
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
      className="md:hidden"
    >
      <div className="flex items-center gap-2 overflow-x-auto px-4 pb-2.5">
        {REPORT_PAGES.map((page) => {
          const Icon = page.icon
          const isActive = active === page.id

          return (
            <button
              key={page.id}
              type="button"
              onClick={() => onSelect(page.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-[13px] whitespace-nowrap ${
                isActive
                  ? 'font-semibold text-white shadow-[var(--shadow-rest)]'
                  : 'font-medium text-(--color-ink-muted) bg-white/70'
              }`}
              style={isActive ? { background: GRADIENT.brand } : undefined}
            >
              <Icon size={16} className="shrink-0" />
              {page.label}
            </button>
          )
        })}
        <span className="shrink-0 pl-1">
          <StatusPill level={level} />
        </span>
      </div>
    </nav>
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
      /* Distinct from the mobile strip: two landmarks sharing one name are
         indistinguishable in a screen reader's landmark list. */
      aria-label="Report pages sidebar"
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
                  className={`flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-[13px] transition-all ${
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
