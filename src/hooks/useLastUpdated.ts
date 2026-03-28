"use client"
import { useState, useCallback, useEffect } from "react"

export function useLastUpdated() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [, setTick] = useState(0)

  const markUpdated = useCallback(() => {
    setLastUpdated(new Date())
  }, [])

  // Re-render every 30s so relative time stays fresh
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const formatLastUpdated = (): string => {
    if (!lastUpdated) return ""
    const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000)
    if (seconds < 10) return "just now"
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    return `${Math.floor(minutes / 60)}h ago`
  }

  return { lastUpdated, markUpdated, formatLastUpdated }
}
