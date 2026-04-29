'use client'

export default function Skeleton({ className = '', count = 1 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`skeleton ${className}`} />
      ))}
    </>
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-soft p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3 rounded-lg" />
          <Skeleton className="h-3 w-1/2 rounded-lg" />
        </div>
      </div>
      <Skeleton className="h-8 w-2/3 rounded-lg" />
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 6 }) {
  return (
    <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
      <div className="px-5 py-3.5 bg-surface-50 border-b border-surface-100">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-3 flex-1 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-surface-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-5 py-4 flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-3 flex-1 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
