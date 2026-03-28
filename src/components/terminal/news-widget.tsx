"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ExternalLink, RefreshCw } from "lucide-react"
import { FeedSkeleton } from "@/components/terminal/widget-skeleton"

interface NewsItem {
  title: string
  url: string
  source: string
  published_at: string
  currencies: string[]
}

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
  const [error, setError] = useState<string | null>(null)
  const [newCount, setNewCount] = useState(0)
  const [clickedUrl, setClickedUrl] = useState<string | null>(null)
  const seenTitlesRef = useRef<Set<string>>(new Set())
  const animatedUrlsRef = useRef<Set<string>>(new Set())
  const isInitialLoadRef = useRef(true)
  const lastFetchRef = useRef<number>(0)

  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch("/api/news")
      if (!res.ok) throw new Error("Failed to fetch news")
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const items = data.news as NewsItem[]

      // Count new articles since last fetch
      if (seenTitlesRef.current.size > 0) {
        const fresh = items.filter(n => !seenTitlesRef.current.has(n.title)).length
        if (fresh > 0) setNewCount(fresh)
      }

      // On initial load, mark all items as already animated
      if (isInitialLoadRef.current) {
        items.forEach(n => animatedUrlsRef.current.add(n.url || n.title))
        isInitialLoadRef.current = false
      }

      // Track all seen titles
      items.forEach(n => seenTitlesRef.current.add(n.title))
      lastFetchRef.current = Date.now()

      setNews(items)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNews()
    const interval = setInterval(fetchNews, 2 * 60_000)
    return () => clearInterval(interval)
  }, [fetchNews])

  // Clear "new" badge after 30s
  useEffect(() => {
    if (newCount > 0) {
      const t = setTimeout(() => setNewCount(0), 30_000)
      return () => clearTimeout(t)
    }
  }, [newCount])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Crypto News</span>
          <span className="text-[9px] text-green-400 font-medium">● LIVE</span>
          {newCount > 0 && (
            <span className="text-[9px] bg-primary text-primary-foreground px-1.5 rounded-full font-bold animate-pulse">
              {newCount} NEW
            </span>
          )}
        </div>
        <button
          onClick={fetchNews}
          className="p-1 text-muted-foreground hover:text-primary transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto min-h-0">
        {loading && news.length === 0 ? (
          <FeedSkeleton rows={4} />
        ) : error && news.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-xs gap-2 p-4">
            <span className="text-red-400">{error}</span>
            <button onClick={fetchNews} className="text-primary hover:underline">Retry</button>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {news.map((item, i) => {
              const itemKey = item.url || item.title
              const isNew = !animatedUrlsRef.current.has(itemKey)
              return (
              <a
                key={itemKey || i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex flex-col gap-1 px-3 py-2.5 hover:bg-secondary/30 transition-colors group ${isNew ? "animate-slide-in" : ""} ${clickedUrl === item.url ? "flash-up" : ""}`}
                onAnimationEnd={() => animatedUrlsRef.current.add(itemKey)}
                onClick={() => {
                  setClickedUrl(item.url)
                  setTimeout(() => setClickedUrl(null), 400)
                }}
              >
                <div className="flex items-start gap-2">
                  {(Date.now() - new Date(item.published_at).getTime()) < 5 * 60_000 && (
                    <span className="shrink-0 mt-0.5 size-1.5 rounded-full bg-green-400 animate-pulse" title="Just published" />
                  )}
                  <p className="text-xs text-foreground leading-tight flex-1 group-hover:text-primary transition-colors">
                    {item.title}
                  </p>
                  <ExternalLink className="size-3 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                  <span className="font-medium">{item.source}</span>
                  <span>&middot;</span>
                  <span>{timeAgo(item.published_at)}</span>
                  {item.currencies.length > 0 && (
                    <>
                      <span>&middot;</span>
                      <div className="flex items-center gap-1">
                        {item.currencies.slice(0, 3).map((c) => (
                          <span key={c} className="rounded bg-primary/10 px-1 py-0 text-primary font-mono">
                            {c}
                          </span>
                        ))}
                        {item.currencies.length > 3 && (
                          <span className="text-muted-foreground/60">+{item.currencies.length - 3}</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </a>
              )
            })}
          </div>
        )}
      </div>

      <div className="border-t border-border px-3 py-1 shrink-0 text-center">
        <span className="text-[8px] text-muted-foreground">
          GNews · {news.length} articles
        </span>
      </div>
    </div>
  )
}
