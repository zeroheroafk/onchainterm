"use client"

import { useState, useEffect, useRef } from "react"
import { ArrowUpDown } from "lucide-react"

const CONVERSIONS = [
  { label: "ETH \u2194 Gwei", from: "ETH", to: "Gwei", factor: 1e9 },
  { label: "ETH \u2194 Wei", from: "ETH", to: "Wei", factor: 1e18 },
  { label: "BTC \u2194 Satoshi", from: "BTC", to: "Satoshi", factor: 1e8 },
  { label: "SOL \u2194 Lamport", from: "SOL", to: "Lamport", factor: 1e9 },
] as const

export function ConverterWidget() {
  const [convIndex, setConvIndex] = useState(0)
  const [inputValue, setInputValue] = useState("")
  const [direction, setDirection] = useState<"forward" | "reverse">("forward")
  const [recentConversions, setRecentConversions] = useState<{amount: string, from: string, to: string, result: string}[]>([])
  const [resultKey, setResultKey] = useState(0)
  const prevResult = useRef<string>("")

  const conv = CONVERSIONS[convIndex]
  const numValue = parseFloat(inputValue) || 0

  const result = direction === "forward"
    ? numValue * conv.factor
    : numValue / conv.factor

  const fromLabel = direction === "forward" ? conv.from : conv.to
  const toLabel = direction === "forward" ? conv.to : conv.from

  // Track result changes for animation and recent conversions
  const formattedResult = (() => {
    const n = result
    if (n === 0) return "0"
    if (n >= 1e15) return n.toExponential(4)
    if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 4 })
    return n.toFixed(18).replace(/0+$/, "").replace(/\.$/, "")
  })()

  useEffect(() => {
    if (formattedResult !== prevResult.current) {
      prevResult.current = formattedResult
      setResultKey(k => k + 1)
    }
  }, [formattedResult])

  const addRecentConversion = () => {
    if (numValue === 0) return
    const entry = { amount: inputValue, from: fromLabel, to: toLabel, result: formattedResult }
    setRecentConversions(prev => [entry, ...prev.filter((c, i) => i < 4)])
  }

  return (
    <div className="h-full p-3 space-y-3">
      {/* Conversion type selector */}
      <div className="flex flex-wrap gap-1">
        {CONVERSIONS.map((c, i) => (
          <button
            key={i}
            onClick={() => { setConvIndex(i); setInputValue("") }}
            className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
              convIndex === i
                ? "bg-primary/15 text-primary border border-primary/30"
                : "text-muted-foreground border border-border hover:bg-secondary"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="space-y-2">
        <div className="rounded-lg border border-border bg-secondary/20 p-3">
          <label className="text-[9px] uppercase tracking-wider text-muted-foreground">{fromLabel}</label>
          <input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="0"
            className="w-full bg-transparent text-lg font-mono text-foreground outline-none mt-1"
          />
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => { setDirection(d => d === "forward" ? "reverse" : "forward"); addRecentConversion() }}
            className="rounded-full p-1.5 border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
          >
            <ArrowUpDown className="size-3.5 transition-transform duration-200 hover:rotate-180" />
          </button>
        </div>

        <div className="rounded-lg border border-border bg-secondary/20 p-3">
          <label className="text-[9px] uppercase tracking-wider text-muted-foreground">{toLabel}</label>
          <div key={resultKey} className="text-lg font-mono text-primary mt-1 break-all animate-fade-in">
            {formattedResult}
          </div>
        </div>
      </div>

      {/* Recent conversions */}
      {recentConversions.length > 0 && (
        <div className="mt-2 border-t border-border/50 pt-2">
          <span className="text-[8px] text-muted-foreground uppercase">Recent</span>
          {recentConversions.map((c, i) => (
            <div key={i} className="text-[9px] text-muted-foreground py-0.5">
              {c.amount} {c.from} = {c.result} {c.to}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
