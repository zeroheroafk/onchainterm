"use client"

import { useState, useEffect, useCallback } from "react"

/**
 * Returns an opacity class based on how old a timestamp is.
 * < 1 min: full opacity
 * 1-5 min: 80% opacity
 * 5-15 min: 60% opacity
 * 15-60 min: 40% opacity
 * > 1 hour: 30% opacity
 */
export function getTimestampOpacity(timestamp: Date | string | number): string {
  const now = Date.now()
  const ts = new Date(timestamp).getTime()
  const ageMs = now - ts
  const ageMin = ageMs / 60000

  if (ageMin < 1) return "text-muted-foreground/70"
  if (ageMin < 5) return "text-muted-foreground/60"
  if (ageMin < 15) return "text-muted-foreground/50"
  if (ageMin < 60) return "text-muted-foreground/40"
  return "text-muted-foreground/30"
}

/**
 * Hook that re-renders periodically to update timestamp opacity.
 * Returns a function that gives the right opacity class for a timestamp.
 */
export function useTimestampAge(intervalMs: number = 30000) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return useCallback((timestamp: Date | string | number) => {
    return getTimestampOpacity(timestamp)
  }, [])
}
