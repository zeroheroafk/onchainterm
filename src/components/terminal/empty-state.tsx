"use client"

interface EmptyStateProps {
  variant?: "no-data" | "error" | "loading-failed"
  message?: string
  onRetry?: () => void
}

export function EmptyState({ variant = "no-data", message, onRetry }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 py-8 px-4">
      <div className="text-muted-foreground/20">
        {variant === "no-data" && (
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="8" width="40" height="32" rx="2" />
            <polyline points="4,36 14,28 20,32 30,20 44,28" />
            <line x1="4" y1="40" x2="44" y2="40" opacity="0.3" />
          </svg>
        )}
        {variant === "error" && (
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="24" cy="24" r="18" />
            <line x1="18" y1="18" x2="30" y2="30" />
            <line x1="30" y1="18" x2="18" y2="30" />
          </svg>
        )}
        {variant === "loading-failed" && (
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 24 C8 24 14 12 24 12 C34 12 40 24 40 24" />
            <path d="M8 24 C8 24 14 36 24 36 C34 36 40 24 40 24" strokeDasharray="4 4" />
            <circle cx="24" cy="24" r="4" />
            <line x1="24" y1="4" x2="24" y2="10" />
            <line x1="24" y1="38" x2="24" y2="44" />
          </svg>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground/40 text-center max-w-[160px] leading-relaxed">
        {message || (variant === "no-data" ? "No data available" : variant === "error" ? "Something went wrong" : "Failed to load data")}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-[9px] text-primary/60 hover:text-primary transition-colors uppercase tracking-wider font-medium"
        >
          Retry
        </button>
      )}
    </div>
  )
}
