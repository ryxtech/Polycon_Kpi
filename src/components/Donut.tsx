import { useEffect, useState } from 'react'
import { PALETTE } from '@/config/theme'
import { prefersReducedMotion } from '@/lib/motion'

interface Segment {
  label: string
  value: number
  color: string
}

interface DonutProps {
  segments: Segment[]
  centerValue: string
  centerLabel: string
  size?: number
}

/**
 * Ring chart drawn as one stroked circle per segment.
 *
 * Round line caps and a gap between segments give the thick, soft arcs the
 * reference dashboards use; `stroke-dasharray` with a running offset avoids
 * arc-path maths entirely. Kept to two or three segments — beyond that a bar
 * chart reads more accurately.
 */
export function Donut({
  segments,
  centerValue,
  centerLabel,
  size = 156,
}: DonutProps) {
  const [drawn, setDrawn] = useState(prefersReducedMotion())

  useEffect(() => {
    if (prefersReducedMotion()) return
    const id = window.setTimeout(() => setDrawn(true), 60)
    return () => window.clearTimeout(id)
  }, [])

  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  const strokeWidth = size * 0.115
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  // A small gap between arcs reads as separate segments without a stroke.
  const gap = total > 1 ? circumference * 0.012 : 0

  let offset = 0

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${centerLabel}: ${centerValue}. ${segments
        .map((segment) => `${segment.label} ${segment.value}`)
        .join(', ')}`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={PALETTE.surfaceSunken}
        strokeWidth={strokeWidth}
      />
      {total > 0 &&
        segments.map((segment) => {
          const full = (segment.value / total) * circumference
          const dash = Math.max(full - gap, 0)
          const element = (
            <circle
              key={segment.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${drawn ? dash : 0} ${circumference - (drawn ? dash : 0)}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{
                transition: 'stroke-dasharray 700ms cubic-bezier(0.22,1,0.36,1)',
              }}
            />
          )
          offset += full
          return element
        })}
      <text
        x="50%"
        y="46%"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontSize: size * 0.215,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
          fill: PALETTE.ink,
        }}
      >
        {centerValue}
      </text>
      <text
        x="50%"
        y="64%"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontSize: size * 0.072,
          fontWeight: 500,
          letterSpacing: '0.06em',
          fill: PALETTE.inkFaint,
        }}
      >
        {centerLabel.toUpperCase()}
      </text>
    </svg>
  )
}
