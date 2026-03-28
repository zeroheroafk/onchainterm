"use client"

import { useState, useEffect, useCallback, useRef, type FormEvent } from "react"
import { TrendingUp, TrendingDown, ThumbsUp, ThumbsDown, Send, Radio, Plus } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/lib/toast-context"
import { supabase } from "@/lib/supabase"

// --- Types ---

interface Signal {
  id: string
  coin: string
  direction: "bullish" | "bearish"
  timeframe: string
  note: string
  username: string
  created_at: string
  upvotes: number
  downvotes: number
}

type SortMode = "latest" | "top"

const TIMEFRAMES = ["1H", "4H", "1D", "1W"] as const
const STORAGE_KEY = "onchainterm_signals"
const VOTES_KEY = "onchainterm_signal_votes"
const CHANNEL_NAME = "trading_signals"

// --- Helpers ---

function loadSignals(): Signal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveSignals(signals: Signal[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(signals))
  } catch {}
}

function loadVotes(): Record<string, "up" | "down"> {
  try {
    const raw = localStorage.getItem(VOTES_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveVotes(votes: Record<string, "up" | "down">) {
  try {
    localStorage.setItem(VOTES_KEY, JSON.stringify(votes))
  } catch {}
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// --- Component ---

export function TradingSignals() {
  const { user, username } = useAuth()
  const { toast } = useToast()
  const [signals, setSignals] = useState<Signal[]>([])
  const [votes, setVotes] = useState<Record<string, "up" | "down">>({})
  const [sortMode, setSortMode] = useState<SortMode>("latest")
  const [connected, setConnected] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const animatedIdsRef = useRef<Set<string>>(new Set())

  // Form state
  const [coin, setCoin] = useState("")
  const [direction, setDirection] = useState<"bullish" | "bearish">("bullish")
  const [timeframe, setTimeframe] = useState<string>("4H")
  const [note, setNote] = useState("")

  // Load from localStorage on mount
  useEffect(() => {
    const loaded = loadSignals()
    loaded.forEach((s) => seenIdsRef.current.add(s.id))
    setSignals(loaded)
    setVotes(loadVotes())
  }, [])

  // Subscribe to broadcast channel
  useEffect(() => {
    const channel = supabase
      .channel(CHANNEL_NAME)
      .on("broadcast", { event: "new_signal" }, (payload) => {
        const incoming = payload.payload as Signal
        if (!seenIdsRef.current.has(incoming.id)) {
          animatedIdsRef.current.add(incoming.id)
          seenIdsRef.current.add(incoming.id)
        }
        setSignals((prev) => {
          if (prev.some((s) => s.id === incoming.id)) return prev
          const next = [incoming, ...prev]
          saveSignals(next)
          return next
        })
      })
      .on("broadcast", { event: "vote_update" }, (payload) => {
        const { signalId, upvotes, downvotes } = payload.payload as {
          signalId: string
          upvotes: number
          downvotes: number
        }
        setSignals((prev) => {
          const next = prev.map((s) =>
            s.id === signalId ? { ...s, upvotes, downvotes } : s
          )
          saveSignals(next)
          return next
        })
      })
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED")
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Post a new signal
  const handlePost = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      const trimmedCoin = coin.trim().toUpperCase()
      const trimmedNote = note.trim()
      if (!trimmedCoin || !trimmedNote || !user) return

      const newSignal: Signal = {
        id: crypto.randomUUID(),
        coin: trimmedCoin,
        direction,
        timeframe,
        note: trimmedNote,
        username: username || user.email?.split("@")[0] || "anon",
        created_at: new Date().toISOString(),
        upvotes: 0,
        downvotes: 0,
      }

      // Add locally
      animatedIdsRef.current.add(newSignal.id)
      seenIdsRef.current.add(newSignal.id)
      setSignals((prev) => {
        const next = [newSignal, ...prev]
        saveSignals(next)
        return next
      })

      // Broadcast to others
      const channel = supabase.channel(CHANNEL_NAME)
      await channel.send({
        type: "broadcast",
        event: "new_signal",
        payload: newSignal,
      })

      // Reset form
      setCoin("")
      setNote("")
    },
    [coin, direction, timeframe, note, user, username]
  )

  // Vote on a signal
  const handleVote = useCallback(
    async (signalId: string, voteType: "up" | "down") => {
      // Compute the vote transition upfront to avoid reading stale state
      const currentVote = votes[signalId] || null
      const newVote = currentVote === voteType ? null : voteType

      // Update votes state
      setVotes((prev) => {
        const next = { ...prev }
        if (newVote) {
          next[signalId] = newVote
        } else {
          delete next[signalId]
        }
        saveVotes(next)
        return next
      })

      // Update signal counts using the pre-computed vote transition (not stale state)
      setSignals((prev) => {
        const next = prev.map((s) => {
          if (s.id !== signalId) return s
          let { upvotes, downvotes } = s

          // Remove previous vote
          if (currentVote === "up") upvotes = Math.max(0, upvotes - 1)
          if (currentVote === "down") downvotes = Math.max(0, downvotes - 1)

          // Add new vote
          if (newVote === "up") upvotes++
          if (newVote === "down") downvotes++

          return { ...s, upvotes, downvotes }
        })
        saveSignals(next)

        // Broadcast vote update
        const updated = next.find((s) => s.id === signalId)
        if (updated) {
          const channel = supabase.channel(CHANNEL_NAME)
          channel.send({
            type: "broadcast",
            event: "vote_update",
            payload: { signalId, upvotes: updated.upvotes, downvotes: updated.downvotes },
          })
        }

        return next
      })

      toast("Vote recorded", "success")
    },
    [votes, toast]
  )

  // Sorted signals
  const sortedSignals =
    sortMode === "top"
      ? [...signals].sort((a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes))
      : [...signals].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <Radio className="size-3 text-primary" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-primary">
            Signals
          </h2>
          <span
            className={`text-[9px] font-medium ${
              connected ? "text-positive" : "text-muted-foreground"
            }`}
          >
            {connected ? "● LIVE" : "● Connecting..."}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(["latest", "top"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setSortMode(mode)}
              className={`widget-tab ${
                sortMode === mode
                  ? "widget-tab-active"
                  : ""
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div className="flex flex-col gap-1 p-2">
          {sortedSignals.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-8 space-y-1">
              <div>No signals yet.</div>
              <div className="text-[10px] text-muted-foreground/60">
                Be the first to share a trading signal.
              </div>
            </div>
          )}
          {sortedSignals.map((signal) => {
            const isBullish = signal.direction === "bullish"
            const myVote = votes[signal.id]
            const score = signal.upvotes - signal.downvotes

            return (
              <div
                key={signal.id}
                className={`rounded border border-border bg-secondary/20 px-2.5 py-2 space-y-1${animatedIdsRef.current.has(signal.id) ? " animate-slide-in animate-item-glow" : ""}`}
              >
                {/* Top row: coin + direction + timeframe + time */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold num text-foreground">
                    {signal.coin}
                  </span>
                  <span
                    className={`flex items-center gap-0.5 text-[10px] font-bold uppercase ${
                      isBullish ? "badge badge-positive" : "badge badge-negative"
                    }`}
                  >
                    {isBullish ? (
                      <TrendingUp className="size-3" />
                    ) : (
                      <TrendingDown className="size-3" />
                    )}
                    {signal.direction}
                  </span>
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold num text-primary">
                    {signal.timeframe}
                  </span>
                  <span className="ml-auto text-[9px] text-muted-foreground/40 num">
                    {timeAgo(signal.created_at)}
                  </span>
                </div>

                {/* Note */}
                <p className="text-[11px] text-foreground/80 leading-relaxed">
                  {signal.note}
                </p>

                {/* Bottom row: username + votes */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground num">
                    @{signal.username}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleVote(signal.id, "up")}
                      className={`flex items-center gap-0.5 text-[10px] transition-colors ${
                        myVote === "up"
                          ? "text-positive"
                          : "text-muted-foreground hover:text-positive"
                      }`}
                    >
                      <ThumbsUp className="size-3" />
                      <span className="num">{signal.upvotes}</span>
                    </button>
                    <button
                      onClick={() => handleVote(signal.id, "down")}
                      className={`flex items-center gap-0.5 text-[10px] transition-colors ${
                        myVote === "down"
                          ? "text-negative"
                          : "text-muted-foreground hover:text-negative"
                      }`}
                    >
                      <ThumbsDown className="size-3" />
                      <span className="num">{signal.downvotes}</span>
                    </button>
                    {score !== 0 && (
                      <span
                        className={`text-[9px] font-semibold num ${
                          score > 0 ? "text-positive" : "text-negative"
                        }`}
                      >
                        {score > 0 ? `+${score}` : score}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Post form */}
      <div className="shrink-0 border-t border-border bg-card px-3 py-2 space-y-2">
        {!user ? (
          <div className="text-center text-[11px] text-muted-foreground py-1">
            Sign in to post signals
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="size-3" />
              {showForm ? "Cancel" : "New Signal"}
            </button>
            {showForm && (
              <div className="animate-slide-down">
                <form onSubmit={handlePost} className="space-y-2">
                  {/* Row 1: coin + direction + timeframe */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={coin}
                      onChange={(e) => setCoin(e.target.value)}
                      placeholder="COIN"
                      maxLength={10}
                      className="w-16 rounded border border-border bg-secondary/30 px-2 py-1 text-[11px] num font-semibold text-foreground uppercase placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDirection((d) => (d === "bullish" ? "bearish" : "bullish"))
                      }
                      className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold uppercase transition-colors duration-150 ${
                        direction === "bullish"
                          ? "bg-positive/15 text-positive border border-positive/30"
                          : "bg-negative/15 text-negative border border-negative/30"
                      }`}
                    >
                      {direction === "bullish" ? (
                        <TrendingUp className="size-3" />
                      ) : (
                        <TrendingDown className="size-3" />
                      )}
                      {direction}
                    </button>
                    <select
                      value={timeframe}
                      onChange={(e) => setTimeframe(e.target.value)}
                      className="rounded border border-border bg-secondary/30 px-1.5 py-1 text-[10px] num font-semibold text-foreground focus:outline-none focus:border-primary"
                    >
                      {TIMEFRAMES.map((tf) => (
                        <option key={tf} value={tf}>
                          {tf}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Row 2: note + send */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Brief note (max 140 chars)..."
                      maxLength={140}
                      className="flex-1 rounded border border-border bg-secondary/30 px-2 py-1 text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary num"
                    />
                    <button
                      type="submit"
                      disabled={!coin.trim() || !note.trim()}
                      className="flex size-7 items-center justify-center rounded bg-primary text-primary-foreground transition-colors hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Send className="size-3.5" />
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
