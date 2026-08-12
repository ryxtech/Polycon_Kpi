import type { ReactNode } from 'react'
import { stagger } from '@/lib/motion'

interface CardProps {
  title?: string
  subtitle?: string
  /** Right-aligned slot in the header — legend, filter, status. */
  actions?: ReactNode
  children: ReactNode
  className?: string
  /** Removes body padding for tables that manage their own. */
  flush?: boolean
  /** Position in a staggered entrance. Omit to skip the animation. */
  index?: number
}

/**
 * The standard surface.
 *
 * Every chart, table and panel sits in one of these, which is what makes a page
 * read as a single report rather than a pile of widgets. Elevation carries the
 * structure — there is no border, because a hairline box on a tinted ground is
 * the thing that makes an interface look a decade old.
 */
export function Card({
  title,
  subtitle,
  actions,
  children,
  className = '',
  flush = false,
  index,
}: CardProps) {
  return (
    <section
      className={`card ${index !== undefined ? 'rise' : ''} ${className}`}
      style={index !== undefined ? stagger(index) : undefined}
    >
      {title && (
        <header className="card-head">
          <div className="min-w-0">
            <h2 className="card-title truncate">{title}</h2>
            {subtitle && <p className="card-sub truncate">{subtitle}</p>}
          </div>
          {actions && (
            <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>
          )}
        </header>
      )}
      <div className={flush ? 'min-w-0 flex-1' : title ? 'card-body' : 'p-5'}>
        {children}
      </div>
    </section>
  )
}
