"use client"

import { useCryptoPrices } from "@/hooks/useCryptoPrices"
import { formatPrice, formatPercentage, formatLargeNumber } from "@/lib/constants"
import Link from "next/link"
import { ArrowRight, BarChart3, Zap, Shield, LayoutGrid, TrendingUp, TrendingDown, Activity } from "lucide-react"

function LiveTicker({ data }: { data: { id: string; symbol: string; current_price: number; price_change_percentage_24h: number }[] }) {
  if (data.length === 0) return null
  return (
    <div className="overflow-hidden border-y border-border/30 bg-card/30">
      <div className="flex animate-ticker" style={{ width: "200%" }}>
        {[0, 1].map(copy => (
          <div key={copy} className="flex shrink-0">
            {data.slice(0, 20).map(coin => (
              <span key={`${copy}-${coin.id}`} className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[11px]">
                <span className="font-bold text-foreground">{coin.symbol.toUpperCase()}</span>
                <span className="text-foreground/70">{formatPrice(coin.current_price)}</span>
                <span className={coin.price_change_percentage_24h >= 0 ? "text-positive" : "text-negative"}>
                  {formatPercentage(coin.price_change_percentage_24h)}
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function MiniTable({ data }: { data: { id: string; symbol: string; name: string; current_price: number; price_change_percentage_24h: number; market_cap: number; market_cap_rank: number }[] }) {
  return (
    <div className="overflow-hidden border border-border/40 bg-card/50">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-border/40 text-muted-foreground/60">
            <th className="py-1.5 px-2 text-left font-medium">#</th>
            <th className="py-1.5 px-2 text-left font-medium">Asset</th>
            <th className="py-1.5 px-2 text-right font-medium">Price</th>
            <th className="py-1.5 px-2 text-right font-medium">24h</th>
            <th className="py-1.5 px-2 text-right font-medium hidden sm:table-cell">Market Cap</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 10).map((coin, i) => (
            <tr key={coin.id} className="border-b border-border/20 hover:bg-secondary/20 transition-colors" style={{ animationDelay: `${i * 40}ms` }}>
              <td className="py-1.5 px-2 text-muted-foreground/50">{coin.market_cap_rank}</td>
              <td className="py-1.5 px-2">
                <span className="font-bold text-foreground">{coin.symbol.toUpperCase()}</span>
                <span className="text-muted-foreground/50 ml-1.5 hidden md:inline">{coin.name}</span>
              </td>
              <td className="py-1.5 px-2 text-right text-foreground">{formatPrice(coin.current_price)}</td>
              <td className={`py-1.5 px-2 text-right ${coin.price_change_percentage_24h >= 0 ? "text-positive" : "text-negative"}`}>
                {formatPercentage(coin.price_change_percentage_24h)}
              </td>
              <td className="py-1.5 px-2 text-right text-muted-foreground/60 hidden sm:table-cell">{formatLargeNumber(coin.market_cap)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const FEATURES = [
  { icon: LayoutGrid, title: "35+ Widgets", desc: "Charts, prices, news, portfolio, DeFi, NFTs, and more" },
  { icon: Zap, title: "Real-Time Data", desc: "Live market feeds with sub-minute refresh rates" },
  { icon: BarChart3, title: "Pro Analytics", desc: "Correlations, screening, on-chain metrics, funding rates" },
  { icon: Shield, title: "Your Layout", desc: "Drag, resize, and save custom widget presets" },
]

export default function Home() {
  const { data, isLoading } = useCryptoPrices()

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Live ticker at the very top */}
      <LiveTicker data={data} />

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-24">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 border border-primary/20 bg-primary/5 px-3 py-1 text-[10px] text-primary font-medium uppercase tracking-wider">
            <Activity className="size-3" />
            Live — {data.length > 0 ? `${data.length} assets tracked` : "connecting..."}
          </div>

          {/* Title */}
          <h1 className="font-heading">
            <span className="block text-3xl sm:text-5xl font-light tracking-tight text-foreground">
              Onchain
            </span>
            <span className="block text-3xl sm:text-5xl font-bold tracking-tight text-primary">
              Term
            </span>
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
            A professional-grade crypto terminal with real-time market data, 35+ customizable widgets, and the density of a Bloomberg screen.
          </p>

          {/* CTA */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/terminal"
              className="group inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 text-sm font-bold transition-all hover:brightness-110"
            >
              Launch Terminal
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="border-t border-border/30 bg-card/20 px-4 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="border border-border/30 bg-card/50 p-4 space-y-2">
                <f.icon className="size-5 text-primary/70" />
                <h3 className="text-xs font-bold text-foreground">{f.title}</h3>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live preview table */}
      {data.length > 0 && (
        <section className="border-t border-border/30 px-4 py-12 sm:py-16">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-primary/60" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Live Market Data</h2>
              </div>
              <span className="text-[9px] text-muted-foreground/50 uppercase">Top 10 by Market Cap</span>
            </div>
            <MiniTable data={data as any} />
            <div className="text-center pt-2">
              <Link href="/terminal" className="inline-flex items-center gap-1.5 text-[11px] text-primary hover:text-primary/80 transition-colors font-medium">
                View all {data.length} assets in terminal
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border/20 px-4 py-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-[10px] text-muted-foreground/40">
          <span>OnchainTerm v2.0</span>
          <span>Market data via CoinGecko</span>
        </div>
      </footer>
    </div>
  )
}
