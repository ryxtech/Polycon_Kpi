/**
 * Icon set — a single family, 1.5px stroke, 24px grid, currentColor.
 *
 * Hand-rolled rather than pulled from a package: eight glyphs do not justify a
 * dependency, and keeping them here guarantees consistent stroke weight and
 * corner treatment, which is the thing that actually reads as polish.
 *
 * All are decorative by default (aria-hidden); the labelled control around them
 * carries the accessible name.
 */
interface IconProps {
  className?: string
  size?: number
}

function base(size: number, className: string) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    className,
  }
}

export function IconGrid({ className = '', size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

export function IconGauge({ className = '', size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3.5 18a9 9 0 1 1 17 0" />
      <path d="M12 18l4.2-5" />
      <circle cx="12" cy="18" r="1.2" />
    </svg>
  )
}

export function IconTimeline({ className = '', size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3 5h11" />
      <path d="M3 12h17" />
      <path d="M3 19h8" />
      <circle cx="16.5" cy="5" r="1.6" />
      <circle cx="13" cy="19" r="1.6" />
    </svg>
  )
}

export function IconMould({ className = '', size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z" />
      <path d="M4 7.5 12 12l8-4.5" />
      <path d="M12 12v9" />
    </svg>
  )
}

export function IconTable({ className = '', size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M3 9.5h18" />
      <path d="M9 9.5V20" />
    </svg>
  )
}

export function IconDatabase({ className = '', size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6" />
      <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
    </svg>
  )
}

export function IconReport({ className = '', size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </svg>
  )
}

export function IconUpload({ className = '', size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 16V4" />
      <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
      <path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" />
    </svg>
  )
}

export function IconAlert({ className = '', size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 4.5 21 19H3z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="16.6" r="0.6" fill="currentColor" />
    </svg>
  )
}

export function IconStack({ className = '', size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 3 3 7.5l9 4.5 9-4.5z" />
      <path d="m3 12.5 9 4.5 9-4.5" />
      <path d="m3 17 9 4.5 9-4.5" />
    </svg>
  )
}

export function IconCube({ className = '', size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z" />
      <path d="M4 7.5 12 12l8-4.5" />
      <path d="M12 12v9" />
    </svg>
  )
}

export function IconCalendar({ className = '', size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M3.5 10h17" />
      <path d="M8 3v4M16 3v4" />
    </svg>
  )
}

export function IconCheck({ className = '', size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  )
}

export function IconChevronRight({ className = '', size = 14 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="m9 5 7 7-7 7" />
    </svg>
  )
}

export function IconClose({ className = '', size = 18 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function IconSearch({ className = '', size = 16 }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  )
}
