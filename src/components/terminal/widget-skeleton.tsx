import { Skeleton } from "@/components/ui/skeleton"

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-1.5 p-2">
      <div className="flex gap-2 mb-2">
        <Skeleton className="h-3 w-8 skeleton-shimmer" />
        <Skeleton className="h-3 w-16 skeleton-shimmer" />
        <Skeleton className="h-3 flex-1 skeleton-shimmer" />
        <Skeleton className="h-3 w-12 skeleton-shimmer" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 py-1.5" style={{ animationDelay: `${i * 0.05}s` }}>
          <Skeleton className="size-5 rounded-full skeleton-shimmer" style={{ animationDelay: '0.1s' }} />
          <Skeleton className="h-3 w-12 skeleton-shimmer" />
          <Skeleton className="h-3 flex-1 skeleton-shimmer" />
          <Skeleton className="h-3 w-14 skeleton-shimmer" />
          <Skeleton className="h-3 w-10 skeleton-shimmer" />
        </div>
      ))}
    </div>
  )
}

export function FeedSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2 p-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-start gap-2 py-2 border-b border-border/15" style={{ animationDelay: `${i * 0.08}s` }}>
          <Skeleton className="size-4 rounded skeleton-shimmer shrink-0 mt-0.5" />
          <div className="flex-1 flex flex-col gap-1.5">
            <Skeleton className="h-3 w-3/4 skeleton-shimmer" />
            <Skeleton className="h-2.5 w-1/2 skeleton-shimmer" />
          </div>
          <Skeleton className="h-3 w-10 skeleton-shimmer" />
        </div>
      ))}
    </div>
  )
}

export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border border-border/20 rounded-lg p-3 flex flex-col gap-2" style={{ animationDelay: `${i * 0.06}s` }}>
          <Skeleton className="h-2.5 w-16 skeleton-shimmer" />
          <Skeleton className="h-4 w-20 skeleton-shimmer" />
          <Skeleton className="h-2.5 w-12 skeleton-shimmer" />
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="flex flex-col h-full p-2 gap-2">
      <div className="flex justify-between">
        <Skeleton className="h-3 w-20 skeleton-shimmer" />
        <Skeleton className="h-3 w-16 skeleton-shimmer" />
      </div>
      <div className="flex-1 flex items-end gap-1 px-2 pb-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 skeleton-shimmer rounded-t-sm"
            style={{ height: `${20 + Math.random() * 60}%`, animationDelay: `${i * 0.05}s` }}
          />
        ))}
      </div>
    </div>
  )
}
