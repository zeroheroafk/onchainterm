"use client"

import { useState, useEffect } from "react"
import { ExternalLink, RefreshCw } from "lucide-react"

interface NewsItem {
  title: string
  url: string
  source: string
  published_at: string
}

// Simulated crypto news — in production, use CryptoPanic API or similar
const MOCK_NEWS: NewsItem[] = [
  { title: "Bitcoin reaches new monthly high amid institutional buying", url: "#", source: "CryptoNews", published_at: new Date().toISOString() },
  { title: "Ethereum L2 networks see record transaction volume", url: "#", source: "The Block", published_at: new Date(Date.now() - 3600000).toISOString() },
  { title: "SEC considering new framework for crypto regulation", url: "#", source: "Reuters", published_at: new Date(Date.now() - 7200000).toISOString() },
  { title: "Solana DeFi TVL surpasses $10B milestone", url: "#", source: "DeFiLlama", published_at: new Date(Date.now() - 10800000).toISOString() },
  { title: "Major bank announces Bitcoin custody service launch", url: "#", source: "Bloomberg", published_at: new Date(Date.now() - 14400000).toISOString() },
  { title: "NFT market shows signs of recovery with new collections", url: "#", source: "NFTNow", published_at: new Date(Date.now() - 18000000).toISOString() },
  { title: "Cross-chain bridges process $500M in 24 hours", url: "#", source: "Dune", published_at: new Date(Date.now() - 21600000).toISOString() },
  { title: "Stablecoin market cap reaches all-time high of $200B", url: "#", source: "CoinDesk", published_at: new Date(Date.now() - 25200000).toISOString() },
]

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function NewsWidget() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadNews = () => {
    setLoading(true)
    // Simulate loading delay
    setTimeout(() => {
      setNews(MOCK_NEWS)
      setLoading(false)
    }, 500)
  }

  useEffect(() => { loadNews() }, [])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Latest News</span>
        <button
          onClick={loadNews}
          className="p-1 text-muted-foreground hover:text-primary transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {loading && news.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">Loading news...</div>
        ) : (
          <div className="divide-y divide-border/50">
            {news.map((item, i) => (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col gap-1 px-3 py-2.5 hover:bg-secondary/30 transition-colors group"
              >
                <div className="flex items-start gap-2">
                  <p className="text-xs text-foreground leading-tight flex-1 group-hover:text-primary transition-colors">
                    {item.title}
                  </p>
                  <ExternalLink className="size-3 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                  <span className="font-medium">{item.source}</span>
                  <span>&middot;</span>
                  <span>{timeAgo(item.published_at)}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
