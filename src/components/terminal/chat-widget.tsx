"use client"

import { useState, useRef, useEffect, useCallback, type FormEvent } from "react"
import { Send, MessagesSquare } from "lucide-react"
import { useTheme } from "@/lib/theme-context"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/lib/toast-context"
import { supabase } from "@/lib/supabase"

interface ChatMessage {
  id: string
  username: string
  content: string
  user_id?: string
  created_at: string
}

type RoomId = "general" | "btc" | "eth" | "defi" | "memes"

const ROOMS: { id: RoomId; label: string }[] = [
  { id: "general", label: "General" },
  { id: "btc", label: "BTC" },
  { id: "eth", label: "ETH" },
  { id: "defi", label: "DeFi" },
  { id: "memes", label: "Memes" },
]

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
  const { user, username: authUsername } = useAuth()
  const { toast } = useToast()
  const isLight = themeId === "light"
  const [fallbackUsername] = useState(() => getOrCreateUsername())
  const myUsername = authUsername || fallbackUsername
  const [activeRoom, setActiveRoom] = useState<RoomId>("general")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [lastSentAt, setLastSentAt] = useState(0)
  const [connected, setConnected] = useState(false)
  const [userCount, setUserCount] = useState(1)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const initialLoadDoneRef = useRef(false)
  const animatedIdsRef = useRef<Set<string>>(new Set())

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Load messages + subscribe based on active room
  useEffect(() => {
    const channelName = `chat_${activeRoom}`
    let pgChannel: ReturnType<typeof supabase.channel> | null = null
    let broadcastChannel: ReturnType<typeof supabase.channel> | null = null

    async function init() {
      initialLoadDoneRef.current = false
      animatedIdsRef.current.clear()

      if (activeRoom === "general") {
        // General room: persisted via postgres_changes (backward compatible)
        const { data } = await supabase
          .from("chat_messages")
          .select("*")
          .order("created_at", { ascending: true })
          .limit(50)

        if (data) {
          setMessages(data)
          initialLoadDoneRef.current = true
        }

        pgChannel = supabase
          .channel("chat_messages")
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "chat_messages" },
            (payload) => {
              const newMsg = payload.new as ChatMessage
              if (initialLoadDoneRef.current) {
                animatedIdsRef.current.add(newMsg.id)
              }
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev
                return [...prev, newMsg]
              })
            }
          )
          .subscribe((status) => {
            setConnected(status === "SUBSCRIBED")
          })
      } else {
        // Other rooms: ephemeral broadcast channels (live-only, no persistence)
        setMessages([])
        initialLoadDoneRef.current = true

        broadcastChannel = supabase
          .channel(channelName)
          .on("broadcast", { event: "message" }, (payload) => {
            const msg = payload.payload as ChatMessage
            animatedIdsRef.current.add(msg.id)
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev
              return [...prev, msg]
            })
          })
          .subscribe((status) => {
            setConnected(status === "SUBSCRIBED")
          })
      }

      // Presence for online user count (per room)
      const presenceChannel = supabase.channel(`presence_${activeRoom}`, {
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
      if (pgChannel) supabase.removeChannel(pgChannel)
      if (broadcastChannel) supabase.removeChannel(broadcastChannel)
      supabase.removeChannel(supabase.channel(`presence_${activeRoom}`))
    }
  }, [myUsername, activeRoom])

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isSending) return
    if (text.length > 300) return

    const now = Date.now()
    if (now - lastSentAt < 2000) return // Rate limit: 2s

    setIsSending(true)
    setInput("")

    if (activeRoom === "general") {
      // Persist to database for General room (requires authentication)
      if (!user) return

      const { error } = await supabase
        .from("chat_messages")
        .insert({ username: myUsername, content: text, user_id: user.id })

      if (error) {
        setInput(text) // Restore input on error
      } else {
        toast("Message sent", "success")
      }
    } else {
      // Broadcast for topic rooms (ephemeral)
      const channelName = `chat_${activeRoom}`
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        username: myUsername,
        content: text,
        created_at: new Date().toISOString(),
      }

      // Add to local state immediately
      animatedIdsRef.current.add(msg.id)
      setMessages((prev) => [...prev, msg])

      // Broadcast to others
      const channel = supabase.channel(channelName)
      await channel.send({
        type: "broadcast",
        event: "message",
        payload: msg,
      })
      toast("Message sent", "success")
    }

    setLastSentAt(Date.now())
    setIsSending(false)
    inputRef.current?.focus()
  }, [input, isSending, lastSentAt, myUsername, activeRoom, user, toast])

  const handleRoomChange = useCallback((room: RoomId) => {
    setActiveRoom(room)
    setConnected(false)
  }, [])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <MessagesSquare className="size-3 text-primary" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
            Chat
          </h2>
          <span className={`text-[9px] font-medium ${connected ? "text-positive" : "text-muted-foreground"}`}>
            {connected ? "● LIVE" : "● Connecting..."}
          </span>
        </div>
        <span className="text-[9px] text-muted-foreground num">
          {userCount} online
        </span>
      </div>

      {/* Room tabs */}
      <div className="shrink-0 flex items-center gap-0 border-b border-border bg-secondary/20 px-1 overflow-x-auto">
        {ROOMS.map((room) => (
          <button
            key={room.id}
            onClick={() => handleRoomChange(room.id)}
            className={`px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap widget-tab ${
              activeRoom === room.id
                ? "text-primary widget-tab-active"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            }`}
          >
            {room.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div key={activeRoom} className="tab-content flex flex-col gap-0.5 p-2">
          {activeRoom !== "general" && messages.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-8 space-y-1">
              <div>No messages in #{activeRoom} yet.</div>
              <div className="text-[10px] text-muted-foreground/60">
                Topic channels are live-only — messages are not persisted.
              </div>
            </div>
          )}
          {activeRoom === "general" && messages.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-8">
              No messages yet. Say something!
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex items-baseline gap-2 rounded px-1.5 py-1 hover:bg-secondary/30${msg.username === myUsername ? " bg-primary/8 border-l-2 border-l-primary/40 rounded-r-lg pl-2" : " bg-secondary/15 rounded-lg"}${animatedIdsRef.current.has(msg.id) ? " animate-slide-in" : ""}`}>
              <span className="shrink-0 text-[10px] text-muted-foreground/50 tabular-nums num">
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
                <span className="text-xs leading-relaxed text-foreground/90">{msg.content}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input */}
      {activeRoom === "general" && !user ? (
        <div className="shrink-0 flex items-center justify-center border-t border-border bg-card px-3 py-2">
          <span className="text-xs text-muted-foreground font-mono">
            Sign in to chat in General
          </span>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="shrink-0 flex items-center gap-2 border-t border-border bg-card px-3 py-2"
        >
          <div className="flex flex-1 items-center gap-2 rounded border border-border/40 bg-secondary/30 px-2 transition-colors focus-within:border-primary/40">
            <span className={`text-xs font-bold font-mono shrink-0 ${user ? "text-primary" : "text-muted-foreground"}`} title={user ? "Signed in" : "Guest — sign in for a custom name"}>
              {myUsername}{">"}
            </span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Message #${activeRoom}...`}
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
      )}
    </div>
  )
}
