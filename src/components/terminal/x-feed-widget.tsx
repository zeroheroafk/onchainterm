"use client"

import { useEffect, useRef, useState } from "react"

// Crypto X/Twitter accounts to show in tabs
const FEEDS = [
  { handle: "whale_alert", label: "Whale Alert" },
  { handle: "WatcherGuru", label: "Watcher Guru" },
  { handle: "CryptoQuant_Com", label: "CryptoQuant" },
  { handle: "coindesk", label: "CoinDesk" },
  { handle: "Cointelegraph", label: "Cointelegraph" },
  { handle: "VitalikButerin", label: "Vitalik" },
  { handle: "saylor", label: "Saylor" },
  { handle: "CZ_Binance", label: "CZ" },
  { handle: "APompliano", label: "Pomp" },
  { handle: "AltcoinGordon", label: "Gordon" },
] as const

declare global {
  interface Window {
    twttr?: {
      widgets: {
        createTimeline: (
          source: { sourceType: string; screenName?: string; id?: string },
          el: HTMLElement,
          options?: Record<string, unknown>
        ) => Promise<HTMLElement>
      }
      _e?: (() => void)[]
    }
  }
}

function loadTwitterScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.twttr?.widgets) {
      resolve()
      return
    }
    if (document.getElementById("twitter-wjs")) {
      // Script tag exists but hasn't loaded yet
      const check = () => {
        if (window.twttr?.widgets) resolve()
        else setTimeout(check, 100)
      }
      check()
      return
    }
    const script = document.createElement("script")
    script.id = "twitter-wjs"
    script.src = "https://platform.twitter.com/widgets.js"
    script.async = true
    script.onload = () => {
      const check = () => {
        if (window.twttr?.widgets) resolve()
        else setTimeout(check, 100)
      }
      check()
    }
    document.head.appendChild(script)
  })
}

function TimelineEmbed({ handle }: { handle: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    const el = containerRef.current
    if (!el) return

    el.innerHTML = ""
    setLoading(true)
    setError(false)

    loadTwitterScript()
      .then(() => {
        if (cancelled || !window.twttr?.widgets) return
        return window.twttr.widgets.createTimeline(
          { sourceType: "profile", screenName: handle },
          el,
          {
            theme: "dark",
            chrome: "noheader nofooter noborders transparent",
            height: 2000,
            dnt: true,
            tweetLimit: 20,
          }
        )
      })
      .then((widget) => {
        if (cancelled) return
        setLoading(false)
        if (!widget) setError(true)
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false)
          setError(true)
        }
      })

    return () => { cancelled = true }
  }, [handle])

  return (
    <div className="h-full overflow-auto">
      {loading && (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-[11px]">
          Loading @{handle} feed...
        </div>
      )}
      {error && (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-[11px]">
          <p className="text-muted-foreground">Could not load @{handle}</p>
          <p className="text-muted-foreground/50">X embeds may be blocked by your browser or ad blocker</p>
        </div>
      )}
      <div ref={containerRef} />
    </div>
  )
}

export function XFeedWidget() {
  const [activeHandle, setActiveHandle] = useState(FEEDS[0].handle)

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border shrink-0 overflow-x-auto scrollbar-none">
        {FEEDS.map(feed => (
          <button
            key={feed.handle}
            onClick={() => setActiveHandle(feed.handle)}
            className={`shrink-0 px-2 py-1 text-[10px] font-medium transition-colors border-b-2 ${
              activeHandle === feed.handle
                ? "text-primary border-b-primary"
                : "text-muted-foreground/60 border-b-transparent hover:text-foreground"
            }`}
          >
            {feed.label}
          </button>
        ))}
      </div>

      {/* Timeline embed */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <TimelineEmbed key={activeHandle} handle={activeHandle} />
      </div>
    </div>
  )
}
