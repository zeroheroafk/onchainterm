"use client"

import { useState, useEffect, useCallback } from "react"
import { CalendarDays, RefreshCw } from "lucide-react"
import { TableSkeleton } from "@/components/terminal/widget-skeleton"
import { useLastUpdated } from "@/hooks/useLastUpdated"

interface CalendarEvent {
  title: string
  date: string
  coin: string
  category: string
  chain?: string
  amount?: number
  investors?: string
}

function formatEventDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + "T00:00:00")
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / 86_400_000)

    const formatted = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays <= 7) return `${formatted} (${diffDays}d ago)`
    return formatted
  } catch {
    return dateStr
  }
}

function roundColor(cat: string): string {
  const lower = cat.toLowerCase()
  if (lower.includes("seed")) return "text-emerald-400 bg-emerald-400/10"
  if (lower.includes("series a")) return "text-blue-400 bg-blue-400/10"
  if (lower.includes("series b")) return "text-violet-400 bg-violet-400/10"
  if (lower.includes("series c") || lower.includes("series d")) return "text-purple-400 bg-purple-400/10"
  if (lower.includes("strategic")) return "text-amber-400 bg-amber-400/10"
  if (lower.includes("pre-seed") || lower.includes("pre seed")) return "text-teal-400 bg-teal-400/10"
  if (lower.includes("private")) return "text-rose-400 bg-rose-400/10"
  if (lower.includes("public") || lower.includes("ido") || lower.includes("ico")) return "text-positive bg-positive/10"
  return "text-muted-foreground bg-secondary/50"
}

export function CryptoCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { markUpdated, formatLastUpdated } = useLastUpdated()

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar")
      if (!res.ok) throw new Error("Failed to fetch")
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setEvents(json.events || [])
      markUpdated()
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [markUpdated])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 1800_000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading && events.length === 0) return <TableSkeleton rows={6} />

  if (error && events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-xs gap-2 p-4">
        <span className="text-red-400">{error}</span>
        <button onClick={fetchData} className="text-primary hover:underline">Retry</button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-3.5 text-primary" />
          <span className="text-xs font-bold text-foreground">Raises & Rounds</span>
        </div>
        <div className="flex items-center gap-1.5">
          {formatLastUpdated() && (
            <span className="text-[8px] text-muted-foreground/50">{formatLastUpdated()}</span>
          )}
          <button onClick={fetchData} className="p-0.5 text-muted-foreground hover:text-primary transition-colors">
            <RefreshCw className="size-3" />
          </button>
        </div>
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-auto">
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs p-4">
            No recent raises found
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {events.map((event, i) => (
              <div
                key={`${event.date}-${event.coin}-${i}`}
                className="px-3 py-2 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium text-foreground leading-snug">
                      {event.title}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {event.chain && (
                        <span className="text-[9px] text-primary font-medium">{event.chain}</span>
                      )}
                      {event.investors && (
                        <span className="text-[9px] text-muted-foreground truncate max-w-[180px]">
                          by {event.investors}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className="text-[10px] num text-foreground font-medium">
                      {formatEventDate(event.date)}
                    </span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-medium ${roundColor(event.category)}`}>
                      {event.category}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-3 py-1 shrink-0 text-center">
        <span className="text-[8px] text-muted-foreground/40">
          DeFiLlama · {events.length} raise{events.length !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  )
}
