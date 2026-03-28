"use client"

import { useState, useMemo } from "react"
import { Coins, Calculator } from "lucide-react"
import { useMarketData } from "@/lib/market-data-context"
import { formatPrice } from "@/lib/constants"

const STAKING_COINS = [
  { symbol: "ETH", name: "Ethereum", coingeckoId: "ethereum", apy: 3.5 },
  { symbol: "SOL", name: "Solana", coingeckoId: "solana", apy: 7.0 },
  { symbol: "ADA", name: "Cardano", coingeckoId: "cardano", apy: 3.5 },
  { symbol: "DOT", name: "Polkadot", coingeckoId: "polkadot", apy: 15.0 },
  { symbol: "ATOM", name: "Cosmos", coingeckoId: "cosmos", apy: 18.0 },
  { symbol: "AVAX", name: "Avalanche", coingeckoId: "avalanche-2", apy: 8.0 },
  { symbol: "MATIC", name: "Polygon", coingeckoId: "matic-network", apy: 5.0 },
  { symbol: "NEAR", name: "NEAR", coingeckoId: "near", apy: 10.0 },
] as const

const DURATIONS = [
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "180 days", days: 180 },
  { label: "1 year", days: 365 },
  { label: "2 years", days: 730 },
] as const

export function StakingCalculator() {
  const { data: marketData } = useMarketData()
  const [selectedCoin, setSelectedCoin] = useState(0)
  const [amount, setAmount] = useState("")
  const [priceOverride, setPriceOverride] = useState("")
  const [durationIndex, setDurationIndex] = useState(3) // default 1 year
  const [customApy, setCustomApy] = useState("")

  const coin = STAKING_COINS[selectedCoin]
  const duration = DURATIONS[durationIndex]

  // Try to get market price
  const marketPrice = useMemo(() => {
    const found = marketData.find(
      (d) => d.id === coin.coingeckoId || d.symbol === coin.symbol.toLowerCase()
    )
    return found?.current_price ?? null
  }, [marketData, coin])

  // When coin changes, reset price override
  const handleCoinChange = (index: number) => {
    setSelectedCoin(index)
    setPriceOverride("")
  }

  const effectivePrice = parseFloat(priceOverride) || marketPrice || 0
  const effectiveApy = parseFloat(customApy) || coin.apy
  const stakeAmount = parseFloat(amount) || 0

  const results = useMemo(() => {
    if (stakeAmount <= 0 || effectivePrice <= 0 || effectiveApy <= 0) return null

    const daysInYear = 365
    const dailyRate = effectiveApy / 100 / daysInYear
    const totalDays = duration.days

    const rewardsTokens = stakeAmount * (effectiveApy / 100) * (totalDays / daysInYear)
    const rewardsUsd = rewardsTokens * effectivePrice
    const initialUsd = stakeAmount * effectivePrice
    const totalUsd = initialUsd + rewardsUsd

    const dailyTokens = stakeAmount * dailyRate
    const dailyUsd = dailyTokens * effectivePrice
    const monthlyTokens = dailyTokens * 30
    const monthlyUsd = monthlyTokens * effectivePrice
    const yearlyTokens = stakeAmount * (effectiveApy / 100)
    const yearlyUsd = yearlyTokens * effectivePrice

    const rewardsPct = (rewardsUsd / totalUsd) * 100

    return {
      rewardsTokens,
      rewardsUsd,
      initialUsd,
      totalUsd,
      dailyTokens,
      dailyUsd,
      monthlyTokens,
      monthlyUsd,
      yearlyTokens,
      yearlyUsd,
      rewardsPct,
    }
  }, [stakeAmount, effectivePrice, effectiveApy, duration.days])

  const formatTokens = (n: number) => {
    if (n < 0.0001) return n.toExponential(2)
    if (n < 1) return n.toFixed(6)
    if (n < 1000) return n.toFixed(4)
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
        <Coins className="size-3.5 text-muted-foreground" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Staking Calculator
        </span>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-3">
        {/* Coin selector */}
        <div className="flex flex-wrap gap-1">
          {STAKING_COINS.map((c, i) => (
            <button
              key={c.symbol}
              onClick={() => handleCoinChange(i)}
              className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                selectedCoin === i
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground border border-border hover:bg-secondary"
              }`}
            >
              {c.symbol}
              <span className="ml-1 opacity-60">{c.apy}%</span>
            </button>
          ))}
        </div>

        {/* Input fields */}
        <div className="grid grid-cols-2 gap-2">
          {/* Amount */}
          <div className="rounded-lg border border-border bg-secondary/20 p-2">
            <label className="text-[9px] uppercase tracking-wider text-muted-foreground">
              Amount ({coin.symbol})
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="0"
              className="w-full bg-transparent text-sm font-mono text-foreground outline-none mt-1"
            />
          </div>

          {/* Price */}
          <div className="rounded-lg border border-border bg-secondary/20 p-2">
            <label className="text-[9px] uppercase tracking-wider text-muted-foreground">
              Price (USD)
            </label>
            <input
              type="number"
              value={priceOverride}
              onChange={(e) => setPriceOverride(e.target.value)}
              placeholder={marketPrice ? marketPrice.toString() : "Enter price"}
              min="0"
              className="w-full bg-transparent text-sm font-mono text-foreground outline-none mt-1"
            />
          </div>

          {/* Duration */}
          <div className="rounded-lg border border-border bg-secondary/20 p-2">
            <label className="text-[9px] uppercase tracking-wider text-muted-foreground">
              Duration
            </label>
            <select
              value={durationIndex}
              onChange={(e) => setDurationIndex(Number(e.target.value))}
              className="w-full bg-transparent text-sm font-mono text-foreground outline-none mt-1 cursor-pointer"
            >
              {DURATIONS.map((d, i) => (
                <option key={i} value={i} className="bg-background text-foreground">
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom APY */}
          <div className="rounded-lg border border-border bg-secondary/20 p-2">
            <label className="text-[9px] uppercase tracking-wider text-muted-foreground">
              Custom APY %
            </label>
            <input
              type="number"
              value={customApy}
              onChange={(e) => setCustomApy(e.target.value)}
              placeholder={coin.apy.toString()}
              min="0"
              max="999"
              step="0.1"
              className="w-full bg-transparent text-sm font-mono text-foreground outline-none mt-1"
            />
          </div>
        </div>

        {/* Results */}
        {results ? (
          <div className="space-y-3">
            {/* Main results */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center gap-1.5 mb-2">
                <Calculator className="size-3 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Estimated Returns ({duration.label})
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[9px] uppercase text-muted-foreground">Rewards</div>
                  <div className="text-sm font-mono text-green-400">
                    {formatTokens(results.rewardsTokens)} {coin.symbol}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground">
                    {formatPrice(results.rewardsUsd)}
                  </div>
                </div>

                <div>
                  <div className="text-[9px] uppercase text-muted-foreground">Total Value</div>
                  <div className="text-sm font-mono text-primary">
                    {formatPrice(results.totalUsd)}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground">
                    {formatTokens(stakeAmount + results.rewardsTokens)} {coin.symbol}
                  </div>
                </div>
              </div>
            </div>

            {/* Bar visualization */}
            <div className="space-y-1">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                Initial vs Rewards
              </div>
              <div className="flex h-5 rounded overflow-hidden border border-border">
                <div
                  className="bg-primary/40 flex items-center justify-center transition-all"
                  style={{ width: `${100 - results.rewardsPct}%` }}
                >
                  {100 - results.rewardsPct > 15 && (
                    <span className="text-[8px] font-mono text-foreground">
                      Initial {(100 - results.rewardsPct).toFixed(1)}%
                    </span>
                  )}
                </div>
                <div
                  className="bg-green-500/40 flex items-center justify-center transition-all"
                  style={{ width: `${results.rewardsPct}%` }}
                >
                  {results.rewardsPct > 10 && (
                    <span className="text-[8px] font-mono text-foreground">
                      +{results.rewardsPct.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <div className="rounded-lg border border-border bg-secondary/20 p-2">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-2">
                Breakdown
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Daily</span>
                  <span className="font-mono text-foreground">
                    {formatTokens(results.dailyTokens)} {coin.symbol}{" "}
                    <span className="text-muted-foreground">({formatPrice(results.dailyUsd)})</span>
                  </span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Monthly</span>
                  <span className="font-mono text-foreground">
                    {formatTokens(results.monthlyTokens)} {coin.symbol}{" "}
                    <span className="text-muted-foreground">({formatPrice(results.monthlyUsd)})</span>
                  </span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Yearly</span>
                  <span className="font-mono text-foreground">
                    {formatTokens(results.yearlyTokens)} {coin.symbol}{" "}
                    <span className="text-muted-foreground">({formatPrice(results.yearlyUsd)})</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <Coins className="size-8 opacity-30 mb-2" />
            <span className="text-[10px]">Enter amount to calculate staking rewards</span>
          </div>
        )}
      </div>
    </div>
  )
}
