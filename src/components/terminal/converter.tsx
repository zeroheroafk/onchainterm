"use client"

import { useState } from "react"
import { ArrowLeftRight } from "lucide-react"

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

  const conv = CONVERSIONS[convIndex]
  const numValue = parseFloat(inputValue) || 0

  const result = direction === "forward"
    ? numValue * conv.factor
    : numValue / conv.factor

  const fromLabel = direction === "forward" ? conv.from : conv.to
  const toLabel = direction === "forward" ? conv.to : conv.from

  const formatResult = (n: number) => {
    if (n === 0) return "0"
    if (n >= 1e15) return n.toExponential(4)
    if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 4 })
    return n.toFixed(18).replace(/0+$/, "").replace(/\.$/, "")
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
            onClick={() => setDirection(d => d === "forward" ? "reverse" : "forward")}
            className="rounded-full p-1.5 border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
          >
            <ArrowLeftRight className="size-3.5" />
          </button>
        </div>

        <div className="rounded-lg border border-border bg-secondary/20 p-3">
          <label className="text-[9px] uppercase tracking-wider text-muted-foreground">{toLabel}</label>
          <div className="text-lg font-mono text-primary mt-1 break-all">
            {formatResult(result)}
          </div>
        </div>
      </div>
    </div>
  )
}
