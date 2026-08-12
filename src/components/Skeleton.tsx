interface SkeletonProps {
  className?: string
  /** Inline width, for text runs of a specific length. */
  width?: string | number
  height?: string | number
  radius?: string
}

/**
 * Shimmer placeholder.
 *
 * Shaped to match the content it stands in for, so the layout does not jump
 * when real data replaces it — the skeleton reserves the space rather than
 * merely filling time.
 */
export function Skeleton({
  className = '',
  width,
  height,
  radius,
}: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton block ${className}`}
      style={{ width, height, borderRadius: radius }}
    />
  )
}

/** KPI tile placeholder — matches the real tile's height exactly. */
export function SkeletonTile() {
  return (
    <div className="card p-5">
      <Skeleton width="55%" height={10} radius="999px" />
      <Skeleton className="mt-3.5" width="42%" height={26} radius="8px" />
      <Skeleton className="mt-3" width="72%" height={9} radius="999px" />
    </div>
  )
}

/** Chart placeholder — a bar silhouette rather than a plain rectangle. */
export function SkeletonChart({ bars = 14 }: { bars?: number }) {
  // Fixed pseudo-random heights: a flat row of equal bars looks like an error
  // state, and Math.random would re-shuffle on every re-render.
  const heights = [46, 72, 58, 84, 63, 91, 55, 77, 40, 68, 86, 52, 74, 60]

  return (
    <div className="card">
      <div className="card-head">
        <Skeleton width={150} height={13} radius="999px" />
        <Skeleton className="ml-auto" width={72} height={22} radius="999px" />
      </div>
      <div className="card-body">
        <div className="flex h-36 items-end gap-1.5">
          {Array.from({ length: bars }, (_, index) => (
            <Skeleton
              key={index}
              className="flex-1"
              height={`${heights[index % heights.length]}%`}
              radius="6px 6px 3px 3px"
            />
          ))}
        </div>
        <Skeleton className="mt-4" width="45%" height={9} radius="999px" />
      </div>
    </div>
  )
}

/** List/table placeholder. */
export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card">
      <div className="card-head">
        <Skeleton width={130} height={13} radius="999px" />
      </div>
      <div className="card-body space-y-3">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton width={30} height={30} radius="10px" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton width={`${72 - index * 6}%`} height={10} radius="999px" />
              <Skeleton width={`${48 - index * 4}%`} height={8} radius="999px" />
            </div>
            <Skeleton width={44} height={18} radius="999px" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** The Overview canvas in skeleton form. */
export function SkeletonReport() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <SkeletonTile key={index} />
        ))}
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <SkeletonChart />
        <div className="card">
          <div className="card-head">
            <Skeleton width={120} height={13} radius="999px" />
          </div>
          <div className="card-body">
            <div className="flex justify-center py-2">
              <Skeleton width={150} height={150} radius="999px" />
            </div>
            <Skeleton className="mt-4" height={34} radius="12px" />
            <Skeleton className="mt-2" height={34} radius="12px" />
          </div>
        </div>
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <SkeletonRows rows={4} />
        <SkeletonRows rows={4} />
      </div>
    </div>
  )
}
