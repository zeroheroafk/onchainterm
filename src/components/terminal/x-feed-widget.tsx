"use client"

import { useState, useRef, useEffect } from "react"
import { ExternalLink } from "lucide-react"

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

function TimelineEmbed({ handle }: { handle: string }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    setLoaded(false)
    setError(false)
    // Timeout: if iframe doesn't load in 12s, show error
    const timeout = setTimeout(() => {
      if (!loaded) setError(true)
    }, 12000)
    return () => clearTimeout(timeout)
  }, [handle])

  // Syndication URL — this is what X's own embed system uses under the hood
  const src = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}?dnt=true&embedId=twitter-widget-0&frame=false&hideBorder=true&hideFooter=true&hideHeader=true&hideScrollBar=false&lang=en&theme=dark&transparent=true`

  return (
    <div className="h-full relative">
      {!loaded && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
          <div className="size-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-muted-foreground text-[11px]">Loading @{handle}...</span>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-[11px] px-4 text-center z-10">
          <p className="text-muted-foreground">Could not load @{handle} feed</p>
          <p className="text-muted-foreground/50 leading-relaxed max-w-[220px]">
            X embeds may be blocked by ad blockers or browser privacy settings
          </p>
          <a
            href={`https://x.com/${handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors font-medium"
          >
            <ExternalLink className="size-3" />
            Open @{handle} on X
          </a>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={src}
        className="w-full h-full border-0"
        style={{ opacity: loaded ? 1 : 0, colorScheme: "dark" }}
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        loading="lazy"
        onLoad={() => { setLoaded(true); setError(false) }}
        onError={() => setError(true)}
        title={`@${handle} X timeline`}
      />
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

      {/* Timeline iframe */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <TimelineEmbed key={activeHandle} handle={activeHandle} />
      </div>
    </div>
  )
}
