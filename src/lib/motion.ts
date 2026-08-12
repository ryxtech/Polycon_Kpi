/**
 * Motion helpers.
 *
 * Every entrance in the product is a transform-and-opacity animation staggered
 * by index. Kept here so the stagger step is one number rather than a magic
 * value repeated across a dozen components.
 */

/** Milliseconds between successive items in a staggered entrance. */
export const STAGGER_MS = 45

/** Longest delay we will apply, so a long list never crawls in. */
const MAX_DELAY_MS = 260

/**
 * Inline style for the nth item of a staggered entrance.
 *
 * Pair with the `rise` class. Returns an empty object under reduced motion so
 * nothing is left mid-transition when animations are disabled.
 */
export function stagger(index: number): { animationDelay?: string } {
  if (prefersReducedMotion()) return {}
  return {
    animationDelay: `${Math.min(index * STAGGER_MS, MAX_DELAY_MS)}ms`,
  }
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
