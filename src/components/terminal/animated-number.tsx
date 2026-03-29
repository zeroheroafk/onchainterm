"use client"
import { useState, useEffect, useCallback } from "react"

interface AnimatedNumberProps {
  value: number
  format?: (v: number) => string
  className?: string
}

export function AnimatedNumber({ value, format, className = "" }: AnimatedNumberProps) {
  const [prevValue, setPrevValue] = useState(value)
  const [flash, setFlash] = useState<"up" | "down" | null>(null)

  // Detect value changes during render using state (React 19 pattern)
  if (value !== prevValue) {
    setPrevValue(value)
    setFlash(value > prevValue ? "up" : "down")
  }

  const clearFlash = useCallback(() => setFlash(null), [])

  useEffect(() => {
    if (flash !== null) {
      const timeout = setTimeout(clearFlash, 600)
      return () => clearTimeout(timeout)
    }
  }, [flash, clearFlash])

  const flashClass = flash === "up" ? "flash-up" : flash === "down" ? "flash-down" : ""
  const colorClass = flash === "up" ? "text-positive" : flash === "down" ? "text-negative" : ""

  return (
    <span className={`num inline-block rounded-sm px-0.5 transition-colors duration-300 ${flashClass} ${colorClass} ${className}`}>
      {format ? format(value) : value.toLocaleString()}
    </span>
  )
}
