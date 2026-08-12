/**
 * Design tokens — soft premium analytics.
 *
 * Cards float on a lavender-tinted ground with layered soft shadows and large
 * radii; structure comes from elevation rather than from hairline borders.
 * Colour is saturated only where it carries data or marks the active path.
 *
 * Mirrored by the `@theme` block in index.css — that serves utility classes,
 * this serves SVG fills and inline styles. Keep the two in step.
 */
export const PALETTE = {
  /** Primary — active nav, focus, the main data series. */
  primary: '#4F46E5',
  primaryDeep: '#4338CA',
  primarySoft: '#818CF8',
  primaryWash: '#EEF0FE',
  /** Second stop of the brand gradient. */
  violet: '#7C3AED',
  /** Accent — reserved for the single thing that needs attention. */
  accent: '#F97316',

  /** The ground. Tinted, so white cards read as lifted rather than as holes. */
  canvas: '#EDEFF8',
  canvasDeep: '#E4E7F4',
  surface: '#FFFFFF',
  surfaceAlt: '#F7F8FD',
  surfaceSunken: '#F1F3FB',

  /** Text. All three clear 4.5:1 on both surface and canvas. */
  ink: '#171A2B',
  inkMuted: '#4C5270',
  inkFaint: '#5D6484',

  hairline: '#E6E9F5',
  gridline: '#EDEFF8',
} as const

/** The brand gradient. Used on the mark, active rail item and primary buttons. */
export const GRADIENT = {
  brand: `linear-gradient(135deg, ${PALETTE.primary} 0%, ${PALETTE.violet} 100%)`,
  brandSoft: 'linear-gradient(135deg, #EEF0FE 0%, #F5F0FE 100%)',
} as const

/** Semantic status fills — dots, bars, arcs. Need 3:1 as graphical objects. */
export const STATUS_COLOR = {
  'on-schedule': '#16A34A',
  // Amber is the hardest hue to keep accessible: the bright #F59E0B reads at
  // only 2.15:1 on white, below the 3:1 a graphical object needs.
  'limited-buffer': '#C2680A',
  critical: '#EF4444',
} as const

/**
 * Status colours for *text*.
 *
 * Darker than the fills because small text needs 4.5:1 while the saturated
 * hues only reach ~2.5-4:1 against their own washes. A pill nobody can read is
 * decoration, not information.
 */
export const STATUS_TEXT = {
  'on-schedule': '#15803D',
  'limited-buffer': '#B45309',
  critical: '#C81E1E',
} as const

export const STATUS_WASH = {
  'on-schedule': '#E7F7ED',
  'limited-buffer': '#FEF3DC',
  critical: '#FDECEC',
} as const

export const STATUS_LABEL = {
  'on-schedule': 'On schedule',
  'limited-buffer': 'Limited buffer',
  critical: 'Action required',
} as const

/** Mould readiness arcs. */
export const READINESS_COLOR = {
  ready: '#16A34A',
  preparing: '#C2680A',
  // Clears 3:1 against both white and the sunken track it sits on.
  pending: '#7E89B4',
} as const

/**
 * Categorical series colours for mould identity.
 *
 * Ordered so adjacent entries stay distinguishable and chosen to remain
 * separable under the common forms of colour blindness. Mould identity on the
 * timeline is also carried by the row label, so colour is never load-bearing.
 */
export const SERIES_COLORS = [
  '#4F46E5',
  '#F97316',
  '#0EA5E9',
  '#A855F7',
  '#14B8A6',
  '#EC4899',
  '#6366F1',
  '#F59E0B',
  '#0891B2',
  '#8B5CF6',
  '#10B981',
  '#E11D48',
  '#3B82F6',
  '#D946EF',
] as const

export function seriesColor(index: number): string {
  return SERIES_COLORS[Math.max(0, index) % SERIES_COLORS.length]
}
