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
        load: (el?: HTMLElement) => void
      }
      _e?: (() => void)[]
      ready: (cb: (twttr: Window["twttr"]) => void) => void
    }
  }
}

function ensureTwitterScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Already loaded
    if (window.twttr?.widgets?.load) {
      resolve()
      return
    }

    // Script tag exists, wait for it
    if (document.getElementById("twitter-wjs")) {
      const t0 = Date.now()
      const check = () => {
        if (window.twttr?.widgets?.load) return resolve()
        if (Date.now() - t0 > 10000) return reject(new Error("timeout"))
        setTimeout(check, 200)
      }
      check()
      return
    }

    // Inject script
    const script = document.createElement("script")
    script.id = "twitter-wjs"
    script.src = "https://platform.twitter.com/widgets.js"
    script.async = true
    script.charset = "utf-8"

    const t0 = Date.now()
    script.onload = () => {
      const check = () => {
        if (window.twttr?.widgets?.load) return resolve()
        if (Date.now() - t0 > 10000) return reject(new Error("timeout"))
        setTimeout(check, 200)
      }
      check()
    }
    script.onerror = () => reject(new Error("Failed to load X widgets.js"))
    document.head.appendChild(script)
  })
}

function TimelineEmbed({ handle }: { handle: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")

  useEffect(() => {
    let cancelled = false
    const el = containerRef.current
    if (!el) return

    // Build the anchor tag that X's widgets.js will convert to an embedded timeline
    el.innerHTML = ""
    const anchor = document.createElement("a")
    anchor.className = "twitter-timeline"
    anchor.setAttribute("data-theme", "dark")
    anchor.setAttribute("data-chrome", "noheader nofooter noborders transparent")
    anchor.setAttribute("data-tweet-limit", "15")
    anchor.setAttribute("data-dnt", "true")
    anchor.href = `https://twitter.com/${handle}`
    anchor.textContent = `Tweets by @${handle}`
    el.appendChild(anchor)

    setStatus("loading")

    ensureTwitterScript()
      .then(() => {
        if (cancelled) return
        window.twttr?.widgets.load(el)

        // Watch for the iframe to appear (means embed loaded)
        let attempts = 0
        const checkLoaded = () => {
          if (cancelled) return
          const iframe = el.querySelector("iframe")
          if (iframe) {
            setStatus("ready")
            return
          }
          attempts++
          if (attempts > 50) {
            // After ~10s, if no iframe appeared, show error
            setStatus("error")
            return
          }
          setTimeout(checkLoaded, 200)
        }
        checkLoaded()
      })
      .catch(() => {
        if (!cancelled) setStatus("error")
      })

    return () => { cancelled = true }
  }, [handle])

  return (
    <div className="h-full overflow-auto">
      {status === "loading" && (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <div className="size-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-muted-foreground text-[11px]">Loading @{handle}...</span>
        </div>
      )}
      {status === "error" && (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-[11px] px-4 text-center">
          <p className="text-muted-foreground">Could not load @{handle}</p>
          <p className="text-muted-foreground/50 leading-relaxed">
            X/Twitter embeds may be blocked by your browser, ad blocker, or network.
            Try disabling ad blockers for this site.
          </p>
          <a
            href={`https://x.com/${handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 text-primary hover:text-primary/80 transition-colors font-medium"
          >
            Open @{handle} on X &rarr;
          </a>
        </div>
      )}
      <div ref={containerRef} style={{ display: status === "loading" ? "none" : "block" }} />
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
