"use client"

import { useState, useRef, useEffect, useCallback, type FormEvent } from "react"
import { Send, MessagesSquare } from "lucide-react"
import { useTheme } from "@/lib/theme-context"

interface ChatMessage {
  id: string
  user: string
  text: string
  timestamp: Date
  isSystem?: boolean
}

// 12-color palettes for username coloring (dark/light)
const USER_COLORS_DARK = [
  "text-sky-400", "text-amber-400", "text-lime-400", "text-fuchsia-400",
  "text-rose-400", "text-cyan-400", "text-orange-400", "text-teal-400",
  "text-indigo-400", "text-pink-400", "text-yellow-400", "text-violet-400",
]

const USER_COLORS_LIGHT = [
  "text-sky-700", "text-amber-700", "text-lime-700", "text-fuchsia-700",
  "text-rose-700", "text-cyan-700", "text-orange-700", "text-teal-700",
  "text-indigo-700", "text-pink-700", "text-yellow-700", "text-violet-700",
]

function getUserColor(username: string, isLight: boolean): string {
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = isLight ? USER_COLORS_LIGHT : USER_COLORS_DARK
  return colors[Math.abs(hash) % colors.length]
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

// Simulated market chatter for realistic feel
const BOT_MESSAGES: { user: string; text: string }[] = [
  { user: "CryptoTrader", text: "BTC looking bullish on the 4H chart" },
  { user: "DeFiAnon", text: "ETH gas fees are finally reasonable today" },
  { user: "WhaleWatcher", text: "Just saw a 500 BTC transfer to Coinbase" },
  { user: "AltSzn", text: "SOL ecosystem has been on fire lately" },
  { user: "BTCMaxi", text: "Stack sats. Simple as." },
  { user: "ChartGuru", text: "RSI divergence forming on ETH daily" },
  { user: "DeFiAnon", text: "New L2 airdrop farming opportunity just dropped" },
  { user: "NftCollector", text: "NFT floor prices recovering slowly" },
  { user: "CryptoTrader", text: "Funding rates turning negative, shorts getting confident" },
  { user: "WhaleWatcher", text: "Binance cold wallet just moved 10k ETH" },
  { user: "OnchainAlpha", text: "Smart money accumulating heavily past 24h" },
  { user: "AltSzn", text: "AVAX and LINK looking ready for a breakout" },
  { user: "ChartGuru", text: "Support holding well at these levels" },
  { user: "BTCMaxi", text: "Halving supply shock hasn't even started yet" },
  { user: "DeFiAnon", text: "TVL on Arbitrum just hit a new ATH" },
  { user: "OnchainAlpha", text: "Exchange outflows increasing, bullish signal" },
]

function generateUsername(): string {
  const adjectives = ["Crypto", "Onchain", "DeFi", "Block", "Hash", "Moon", "Alpha", "Based"]
  const nouns = ["Trader", "Anon", "Whale", "Degen", "Hodler", "Maxi", "Ape", "Chad"]
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  return `${adj}${noun}${Math.floor(Math.random() * 99)}`
}

export function ChatWidget() {
  const { themeId } = useTheme()
  const isLight = themeId === "light"
  const [myUsername] = useState(() => generateUsername())

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const now = Date.now()
    // Pre-populate with a few recent messages
    return [
      { id: "sys", user: "System", text: "Welcome to OnchainTerm Market Chat. Be respectful and stay on topic.", timestamp: new Date(now - 300000), isSystem: true },
      { id: "b1", user: "CryptoTrader", text: "BTC looking bullish on the 4H chart", timestamp: new Date(now - 180000) },
      { id: "b2", user: "DeFiAnon", text: "ETH gas fees are finally reasonable today", timestamp: new Date(now - 120000) },
      { id: "b3", user: "WhaleWatcher", text: "Just saw a 500 BTC transfer to Coinbase", timestamp: new Date(now - 60000) },
      { id: "b4", user: "OnchainAlpha", text: "Smart money accumulating heavily past 24h", timestamp: new Date(now - 30000) },
    ]
  })

  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [lastSentAt, setLastSentAt] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const botIndexRef = useRef(4) // start after the pre-populated ones

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Simulated bot messages every 15-45s
  useEffect(() => {
    const scheduleNext = () => {
      const delay = 15000 + Math.random() * 30000
      return setTimeout(() => {
        const botMsg = BOT_MESSAGES[botIndexRef.current % BOT_MESSAGES.length]
        botIndexRef.current++
        setMessages(prev => [...prev, {
          id: `bot-${Date.now()}`,
          user: botMsg.user,
          text: botMsg.text,
          timestamp: new Date(),
        }])
        timerId = scheduleNext()
      }, delay)
    }
    let timerId = scheduleNext()
    return () => clearTimeout(timerId)
  }, [])

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isSending) return

    if (text.length > 300) return

    const now = Date.now()
    if (now - lastSentAt < 2000) return

    setIsSending(true)
    setInput("")

    // Simulate network delay
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}`,
        user: myUsername,
        text,
        timestamp: new Date(),
      }])
      setLastSentAt(Date.now())
      setIsSending(false)
      inputRef.current?.focus()
    }, 100)
  }, [input, isSending, lastSentAt, myUsername])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 border-b border-border px-3 py-2">
        <MessagesSquare className="size-3 text-primary" />
        <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
          Community Chat
        </h2>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div className="flex flex-col gap-0.5 p-2">
          {messages.map((msg) => (
            <div key={msg.id} className="flex items-baseline gap-2 rounded px-1.5 py-1 hover:bg-secondary/30">
              <span className="shrink-0 text-[10px] text-muted-foreground/60 tabular-nums font-mono">
                {formatTime(msg.timestamp)}
              </span>
              <div className="flex-1 min-w-0">
                {msg.isSystem ? (
                  <span className="text-xs text-amber-400 font-medium">{msg.text}</span>
                ) : (
                  <>
                    <span className={`text-xs font-bold ${
                      msg.user === myUsername
                        ? "text-primary"
                        : getUserColor(msg.user, isLight)
                    }`}>
                      {msg.user}
                    </span>
                    <span className="text-[10px] text-muted-foreground/40">{" : "}</span>
                    <span className="text-xs leading-relaxed text-foreground/90">{msg.text}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 flex items-center gap-2 border-t border-border bg-card px-3 py-2"
      >
        <div className="flex flex-1 items-center gap-2 rounded border border-border bg-secondary/30 px-2">
          <span className="text-xs font-bold text-primary font-mono shrink-0">
            {myUsername}{">"}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={isSending}
            maxLength={300}
            className="flex-1 bg-transparent py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 font-mono"
          />
        </div>
        <button
          type="submit"
          disabled={!input.trim() || isSending}
          className="flex size-7 items-center justify-center rounded bg-primary text-primary-foreground transition-colors hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="size-3.5" />
        </button>
      </form>
    </div>
  )
}
