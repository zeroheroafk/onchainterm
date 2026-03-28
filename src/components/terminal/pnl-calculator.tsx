"use client"

import { useState, useMemo } from "react"
import { Calculator } from "lucide-react"

type PositionType = "long" | "short"

export function PnlCalculator() {
  const [entryPrice, setEntryPrice] = useState("")
  const [exitPrice, setExitPrice] = useState("")
  const [positionSize, setPositionSize] = useState("")
  const [leverage, setLeverage] = useState("1")
  const [feePercent, setFeePercent] = useState("0.1")
  const [positionType, setPositionType] = useState<PositionType>("long")

  const result = useMemo(() => {
    const entry = parseFloat(entryPrice)
    const exit = parseFloat(exitPrice)
    const size = parseFloat(positionSize)
    const lev = parseFloat(leverage) || 1
    const fee = parseFloat(feePercent) || 0

    if (!entry || !exit || !size || entry <= 0 || size <= 0) return null

    const direction = positionType === "long" ? 1 : -1
    const priceDiff = (exit - entry) * direction
    const priceDiffPct = (priceDiff / entry) * 100
    const leveragedPct = priceDiffPct * lev

    const grossPnl = (priceDiff / entry) * size * lev
    const entryFee = (size * fee) / 100
    const exitFee = ((size + grossPnl) * fee) / 100
    const totalFees = entryFee + exitFee
    const netPnl = grossPnl - totalFees

    const roi = (netPnl / size) * 100
    const liquidationPrice = positionType === "long"
      ? entry * (1 - 1 / lev)
      : entry * (1 + 1 / lev)

    return {
      grossPnl,
      totalFees,
      netPnl,
      roi,
      leveragedPct,
      liquidationPrice: lev > 1 ? liquidationPrice : null,
    }
  }, [entryPrice, exitPrice, positionSize, leverage, feePercent, positionType])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
        <Calculator className="size-3.5 text-muted-foreground" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">P&L Calculator</span>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-3">
        {/* Position type toggle */}
        <div className="flex rounded overflow-hidden border border-border">
          <button
            onClick={() => setPositionType("long")}
            className={`flex-1 py-1.5 text-[10px] font-bold transition-colors hover-lift ${
              positionType === "long" ? "bg-green-500/20 text-green-400" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            LONG
          </button>
          <button
            onClick={() => setPositionType("short")}
            className={`flex-1 py-1.5 text-[10px] font-bold transition-colors hover-lift ${
              positionType === "short" ? "bg-red-500/20 text-red-400" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            SHORT
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] text-muted-foreground uppercase">Entry Price ($)</label>
            <input
              type="number"
              value={entryPrice}
              onChange={e => setEntryPrice(e.target.value)}
              placeholder="0.00"
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs font-mono outline-none focus:border-primary/40"
            />
          </div>
          <div>
            <label className="text-[9px] text-muted-foreground uppercase">Exit Price ($)</label>
            <input
              type="number"
              value={exitPrice}
              onChange={e => setExitPrice(e.target.value)}
              placeholder="0.00"
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs font-mono outline-none focus:border-primary/40"
            />
          </div>
          <div>
            <label className="text-[9px] text-muted-foreground uppercase">Position Size ($)</label>
            <input
              type="number"
              value={positionSize}
              onChange={e => setPositionSize(e.target.value)}
              placeholder="1000"
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs font-mono outline-none focus:border-primary/40"
            />
          </div>
          <div>
            <label className="text-[9px] text-muted-foreground uppercase">Leverage</label>
            <input
              type="number"
              value={leverage}
              onChange={e => setLeverage(e.target.value)}
              placeholder="1"
              min="1"
              max="125"
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs font-mono outline-none focus:border-primary/40"
            />
          </div>
          <div className="col-span-2">
            <label className="text-[9px] text-muted-foreground uppercase">Fee per trade (%)</label>
            <input
              type="number"
              value={feePercent}
              onChange={e => setFeePercent(e.target.value)}
              placeholder="0.1"
              step="0.01"
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs font-mono outline-none focus:border-primary/40"
            />
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="animate-fade-in space-y-2 border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Gross P&L</span>
              <span className={`text-xs font-mono font-bold ${result.grossPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                {result.grossPnl >= 0 ? "+" : ""}${result.grossPnl.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Total Fees</span>
              <span className="text-xs font-mono text-amber-400">-${result.totalFees.toFixed(2)}</span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-foreground font-medium">Net P&L</span>
              <span className={`text-sm font-mono font-bold number-transition ${result.netPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                {result.netPnl >= 0 ? "+" : ""}${result.netPnl.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">ROI</span>
              <span className={`text-xs font-mono font-bold ${result.roi >= 0 ? "text-green-400" : "text-red-400"}`}>
                {result.roi >= 0 ? "+" : ""}{result.roi.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Leveraged Change</span>
              <span className={`text-xs font-mono ${result.leveragedPct >= 0 ? "text-green-400" : "text-red-400"}`}>
                {result.leveragedPct >= 0 ? "+" : ""}{result.leveragedPct.toFixed(2)}%
              </span>
            </div>
            {result.liquidationPrice !== null && (
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-red-400 font-medium">Liquidation Price</span>
                  <span className="text-xs font-mono text-red-400">${result.liquidationPrice.toFixed(2)}</span>
                </div>
                <span className="text-[9px] text-muted-foreground">* Approximate — varies by exchange</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
