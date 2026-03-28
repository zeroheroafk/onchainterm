"use client"
import { useRef, useState, useEffect } from "react"

interface AnimatedNumberProps {
  value: number
  format?: (v: number) => string
  className?: string
}

export function AnimatedNumber({ value, format, className = "" }: AnimatedNumberProps) {
  const prevRef = useRef(value)
  const [flash, setFlash] = useState<"up" | "down" | null>(null)

  useEffect(() => {
    if (prevRef.current !== value) {
      setFlash(value > prevRef.current ? "up" : "down")
      prevRef.current = value
      const timeout = setTimeout(() => setFlash(null), 600)
      return () => clearTimeout(timeout)
    }
  }, [value])

  const flashClass = flash === "up" ? "flash-up" : flash === "down" ? "flash-down" : ""
  const colorClass = flash === "up" ? "text-positive" : flash === "down" ? "text-negative" : ""

  return (
    <span className={`num inline-block rounded-sm px-0.5 transition-colors duration-300 ${flashClass} ${colorClass} ${className}`}>
      {format ? format(value) : value.toLocaleString()}
    </span>
  )
}
