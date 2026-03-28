"use client"

import { useState, useRef, useEffect, useCallback, type FormEvent } from "react"
import { Send, MessagesSquare } from "lucide-react"
import { useTheme } from "@/lib/theme-context"
import { supabase } from "@/lib/supabase"

interface ChatMessage {
  id: string
  username: string
  text: string
  created_at: string
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

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

function generateUsername(): string {
  const adjectives = ["Crypto", "Onchain", "DeFi", "Block", "Hash", "Moon", "Alpha", "Based"]
  const nouns = ["Trader", "Anon", "Whale", "Degen", "Hodler", "Maxi", "Ape", "Chad"]
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  return `${adj}${noun}${Math.floor(Math.random() * 99)}`
}

const STORED_USERNAME_KEY = "onchainterm_chat_username"

function getOrCreateUsername(): string {
  if (typeof window === "undefined") return generateUsername()
  const stored = localStorage.getItem(STORED_USERNAME_KEY)
  if (stored) return stored
  const name = generateUsername()
  localStorage.setItem(STORED_USERNAME_KEY, name)
  return name
}

export function ChatWidget() {
  const { themeId } = useTheme()
  const isLight = themeId === "light"
  const [myUsername] = useState(() => getOrCreateUsername())
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [lastSentAt, setLastSentAt] = useState(0)
  const [connected, setConnected] = useState(false)
  const [userCount, setUserCount] = useState(1)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Load recent messages + subscribe to real-time
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function init() {
      // Fetch last 50 messages
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(50)

      if (data) {
        setMessages(data)
      }

      // Subscribe to new messages via real-time
      channel = supabase
        .channel("chat_messages")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "chat_messages" },
          (payload) => {
            const newMsg = payload.new as ChatMessage
            setMessages((prev) => {
              // Deduplicate
              if (prev.some((m) => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
          }
        )
        .subscribe((status) => {
          setConnected(status === "SUBSCRIBED")
        })

      // Presence for online user count
      const presenceChannel = supabase.channel("chat_presence", {
        config: { presence: { key: myUsername } },
      })

      presenceChannel
        .on("presence", { event: "sync" }, () => {
          const state = presenceChannel.presenceState()
          setUserCount(Object.keys(state).length)
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await presenceChannel.track({ username: myUsername, online_at: new Date().toISOString() })
          }
        })
    }

    init()

    return () => {
      if (channel) supabase.removeChannel(channel)
      supabase.removeChannel(supabase.channel("chat_presence"))
    }
  }, [myUsername])

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isSending) return
    if (text.length > 300) return

    const now = Date.now()
    if (now - lastSentAt < 2000) return // Rate limit: 2s

    setIsSending(true)
    setInput("")

    const { error } = await supabase
      .from("chat_messages")
      .insert({ username: myUsername, text })

    if (error) {
      setInput(text) // Restore input on error
    }

    setLastSentAt(Date.now())
    setIsSending(false)
    inputRef.current?.focus()
  }, [input, isSending, lastSentAt, myUsername])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <MessagesSquare className="size-3 text-primary" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
            Market Chat
          </h2>
          <span className={`text-[9px] font-medium ${connected ? "text-green-400" : "text-muted-foreground"}`}>
            {connected ? "● LIVE" : "● Connecting..."}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div className="flex flex-col gap-0.5 p-2">
          {messages.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-8">
              No messages yet. Say something!
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className="flex items-baseline gap-2 rounded px-1.5 py-1 hover:bg-secondary/30">
              <span className="shrink-0 text-[10px] text-muted-foreground/60 tabular-nums font-mono">
                {formatTime(msg.created_at)}
              </span>
              <div className="flex-1 min-w-0">
                <span className={`text-xs font-bold ${
                  msg.username === myUsername
                    ? "text-primary"
                    : getUserColor(msg.username, isLight)
                }`}>
                  {msg.username}
                </span>
                <span className="text-[10px] text-muted-foreground/40">{" : "}</span>
                <span className="text-xs leading-relaxed text-foreground/90">{msg.text}</span>
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
