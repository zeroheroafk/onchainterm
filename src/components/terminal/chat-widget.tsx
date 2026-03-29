"use client"

import { useState, useRef, useEffect, useCallback, type FormEvent } from "react"
import { Send, MessagesSquare, ChevronLeft, User, X } from "lucide-react"
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

interface PMMessage {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  read: boolean
}

interface PMConversation {
  id: string
  participant_1: string
  participant_2: string
  last_message_at: string
  other_user_id: string
  other_user_name: string
}

type RoomId = "general" | "btc" | "eth" | "defi" | "memes"

// A PM tab has a unique key based on the other user
interface PMTab {
  recipientId: string
  recipientName: string
  conversationId: string | null // null until conversation is created/fetched
}

const ROOMS: { id: RoomId; label: string }[] = [
  { id: "general", label: "General" },
  { id: "btc", label: "BTC" },
  { id: "eth", label: "ETH" },
  { id: "defi", label: "DeFi" },
  { id: "memes", label: "Memes" },
]

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

interface ChatWidgetProps {
  onOpenPM?: (recipient: { userId: string; displayName: string }) => void
  pmRecipient?: { userId: string; displayName: string } | null
}

export function ChatWidget({ onOpenPM, pmRecipient }: ChatWidgetProps) {
  const { themeId } = useTheme()
  const { user } = useAuth()
  const { toast } = useToast()
  const isLight = themeId === "light"
  const [fallbackUsername] = useState(() => getOrCreateUsername())
  const { username: authUsername } = useAuth()
  const myUsername = authUsername || fallbackUsername

  // Active tab: either a room ID or "pm:<userId>"
  const [activeTab, setActiveTab] = useState<string>("general")

  // Chat room state
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
  const [animatedIds, setAnimatedIds] = useState<Set<string>>(new Set())

  // PM state
  const [pmTabs, setPmTabs] = useState<PMTab[]>([])
  const [pmMessages, setPmMessages] = useState<PMMessage[]>([])
  const [pmInput, setPmInput] = useState("")
  const [pmSending, setPmSending] = useState(false)
  const pmScrollRef = useRef<HTMLDivElement>(null)
  const pmInputRef = useRef<HTMLInputElement>(null)
  const processedRecipientRef = useRef<string | null>(null)

  const isRoomTab = !activeTab.startsWith("pm:")
  const activeRoom = isRoomTab ? (activeTab as RoomId) : null
  const activePmUserId = !isRoomTab ? activeTab.slice(3) : null
  const activePmTab = pmTabs.find(t => t.recipientId === activePmUserId) || null

  // Auto-scroll on new chat messages
  useEffect(() => {
    if (scrollRef.current && isRoomTab) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isRoomTab])

  // Auto-scroll on new PM messages
  useEffect(() => {
    if (pmScrollRef.current && !isRoomTab) {
      pmScrollRef.current.scrollTop = pmScrollRef.current.scrollHeight
    }
  }, [pmMessages, isRoomTab])

  // Load chat messages + subscribe based on active room
  useEffect(() => {
    if (!activeRoom) return

    const channelName = `chat_${activeRoom}`
    let pgChannel: ReturnType<typeof supabase.channel> | null = null
    let broadcastChannel: ReturnType<typeof supabase.channel> | null = null

    async function init() {
      initialLoadDoneRef.current = false
      animatedIdsRef.current.clear()
      setAnimatedIds(new Set())

      if (activeRoom === "general") {
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
                setAnimatedIds(prev => new Set(prev).add(newMsg.id))
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

  // Chat submit
  const handleChatSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isSending || !activeRoom) return
    if (text.length > 300) return

    const now = Date.now()
    if (now - lastSentAt < 2000) return

    setIsSending(true)
    setInput("")

    if (activeRoom === "general") {
      if (!user) return

      const { error } = await supabase
        .from("chat_messages")
        .insert({ username: myUsername, content: text, user_id: user.id })

      if (error) {
        setInput(text)
      } else {
        toast("Message sent", "success")
      }
    } else {
      const channelName = `chat_${activeRoom}`
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        username: myUsername,
        content: text,
        created_at: new Date().toISOString(),
      }

      animatedIdsRef.current.add(msg.id)
      setMessages((prev) => [...prev, msg])

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

  // ── PM Logic ──

  // Find or create conversation with a user
  const openPMConversation = useCallback(async (recipientId: string, recipientName: string) => {
    if (!user) return

    // Check if tab already exists
    const existing = pmTabs.find(t => t.recipientId === recipientId)
    if (existing) {
      setActiveTab(`pm:${recipientId}`)
      if (existing.conversationId) {
        const { data } = await supabase
          .from("private_messages")
          .select("*")
          .eq("conversation_id", existing.conversationId)
          .order("created_at", { ascending: true })
        if (data) setPmMessages(data)
      }
      return
    }

    // Find existing conversation
    const { data: existingConv } = await supabase
      .from("conversations")
      .select("*")
      .or(`and(participant_1.eq.${user.id},participant_2.eq.${recipientId}),and(participant_1.eq.${recipientId},participant_2.eq.${user.id})`)
      .maybeSingle()

    let conversationId: string | null = null

    if (existingConv) {
      conversationId = existingConv.id
      const { data } = await supabase
        .from("private_messages")
        .select("*")
        .eq("conversation_id", existingConv.id)
        .order("created_at", { ascending: true })
      if (data) setPmMessages(data)

      // Mark as read
      await supabase
        .from("private_messages")
        .update({ read: true })
        .eq("conversation_id", existingConv.id)
        .neq("sender_id", user.id)
        .eq("read", false)
    } else {
      setPmMessages([])
    }

    const newTab: PMTab = { recipientId, recipientName, conversationId }
    setPmTabs(prev => [...prev, newTab])
    setActiveTab(`pm:${recipientId}`)
  }, [user, pmTabs])

  // Handle clicking a username in chat
  const handleOpenPM = useCallback((recipient: { userId: string; displayName: string }) => {
    openPMConversation(recipient.userId, recipient.displayName)
  }, [openPMConversation])

  // Handle external pmRecipient prop
  useEffect(() => {
    if (pmRecipient && user) {
      const key = `${pmRecipient.userId}:${pmRecipient.displayName}`
      if (processedRecipientRef.current !== key) {
        processedRecipientRef.current = key
        openPMConversation(pmRecipient.userId, pmRecipient.displayName)
      }
    }
  }, [pmRecipient, user, openPMConversation])

  // Load PM messages when switching to a PM tab
  useEffect(() => {
    if (!activePmTab || !activePmTab.conversationId) return

    async function loadMessages() {
      const { data } = await supabase
        .from("private_messages")
        .select("*")
        .eq("conversation_id", activePmTab!.conversationId!)
        .order("created_at", { ascending: true })
      if (data) setPmMessages(data)
    }
    loadMessages()
  }, [activePmTab?.conversationId, activePmUserId])

  // Real-time PM subscription
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel("pm_realtime_chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "private_messages" },
        (payload) => {
          const newMsg = payload.new as PMMessage
          // If message belongs to the active PM conversation
          if (activePmTab?.conversationId && newMsg.conversation_id === activePmTab.conversationId) {
            setPmMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
            // Mark as read
            if (newMsg.sender_id !== user.id) {
              supabase
                .from("private_messages")
                .update({ read: true })
                .eq("id", newMsg.id)
                .then()
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, activePmTab?.conversationId])

  // PM submit
  const handlePmSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    const text = pmInput.trim()
    if (!text || pmSending || !user || !activePmTab) return

    setPmSending(true)
    setPmInput("")

    let convId = activePmTab.conversationId

    // Create conversation if it doesn't exist yet
    if (!convId) {
      const { data: newConv, error } = await supabase
        .from("conversations")
        .insert({
          participant_1: user.id,
          participant_2: activePmTab.recipientId,
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error || !newConv) {
        setPmInput(text)
        setPmSending(false)
        return
      }

      convId = newConv.id
      // Update the tab with the new conversation ID
      setPmTabs(prev => prev.map(t =>
        t.recipientId === activePmTab.recipientId
          ? { ...t, conversationId: convId! }
          : t
      ))
    }

    const { error } = await supabase.from("private_messages").insert({
      conversation_id: convId,
      sender_id: user.id,
      content: text,
      read: false,
    })

    if (error) {
      setPmInput(text)
    } else {
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", convId)
      toast("Message sent", "success")
    }

    setPmSending(false)
    pmInputRef.current?.focus()
  }, [pmInput, pmSending, user, activePmTab, toast])

  // Close a PM tab
  const closePmTab = useCallback((recipientId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPmTabs(prev => prev.filter(t => t.recipientId !== recipientId))
    if (activePmUserId === recipientId) {
      setActiveTab("general")
      setPmMessages([])
    }
  }, [activePmUserId])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <MessagesSquare className="size-3 text-primary" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
            Chat
          </h2>
          {isRoomTab && (
            <span className={`text-[9px] font-medium ${connected ? "text-positive" : "text-muted-foreground"}`}>
              {connected ? "● LIVE" : "● Connecting..."}
            </span>
          )}
        </div>
        {isRoomTab && (
          <span className="text-[9px] text-muted-foreground num">
            {userCount} online
          </span>
        )}
        {!isRoomTab && activePmTab && (
          <span className="text-[9px] text-muted-foreground">
            DM with {activePmTab.recipientName}
          </span>
        )}
      </div>

      {/* Tabs: rooms + PM conversations */}
      <div className="shrink-0 flex items-center gap-0 border-b border-border bg-secondary/20 px-1 overflow-x-auto">
        {ROOMS.map((room) => (
          <button
            key={room.id}
            onClick={() => setActiveTab(room.id)}
            className={`px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap widget-tab ${
              activeTab === room.id
                ? "text-primary widget-tab-active"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            }`}
          >
            {room.label}
          </button>
        ))}
        {pmTabs.map((tab) => (
          <button
            key={`pm:${tab.recipientId}`}
            onClick={() => setActiveTab(`pm:${tab.recipientId}`)}
            className={`group flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold tracking-wider transition-colors whitespace-nowrap widget-tab ${
              activeTab === `pm:${tab.recipientId}`
                ? "text-primary widget-tab-active"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            }`}
          >
            <User className="size-2.5" />
            <span className="max-w-[60px] truncate">{tab.recipientName}</span>
            <span
              role="button"
              onClick={(e) => closePmTab(tab.recipientId, e)}
              className="ml-0.5 rounded-sm p-0.5 opacity-0 group-hover:opacity-100 hover:bg-secondary transition-opacity"
            >
              <X className="size-2" />
            </span>
          </button>
        ))}
      </div>

      {/* Room chat content */}
      {isRoomTab && (
        <>
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
                <div key={msg.id} className={`flex items-baseline gap-2 rounded px-1.5 py-1 hover:bg-secondary/30${msg.username === myUsername ? " bg-primary/8 border-l-2 border-l-primary/40 rounded-r-lg pl-2" : " bg-secondary/15 rounded-lg"}${animatedIds.has(msg.id) ? " animate-slide-in" : ""}`}>
                  <span className="shrink-0 text-[10px] text-muted-foreground/50 tabular-nums num">
                    {formatTime(msg.created_at)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => {
                        if (msg.user_id && msg.username !== myUsername) {
                          handleOpenPM({ userId: msg.user_id, displayName: msg.username })
                        }
                      }}
                      disabled={!msg.user_id || msg.username === myUsername}
                      className={`text-xs font-bold ${
                        msg.username === myUsername
                          ? "text-primary"
                          : getUserColor(msg.username, isLight)
                      } ${msg.user_id && msg.username !== myUsername ? "hover:underline cursor-pointer" : "cursor-default"}`}
                      title={msg.user_id && msg.username !== myUsername ? `Message ${msg.username}` : undefined}
                    >
                      {msg.username}
                    </button>
                    <span className="text-[10px] text-muted-foreground/40">{" : "}</span>
                    <span className="text-xs leading-relaxed text-foreground/90">{msg.content}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Room chat input */}
          {activeRoom === "general" && !user ? (
            <div className="shrink-0 flex items-center justify-center border-t border-border bg-card px-3 py-2">
              <span className="text-xs text-muted-foreground font-mono">
                Sign in to chat in General
              </span>
            </div>
          ) : (
            <form
              onSubmit={handleChatSubmit}
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
        </>
      )}

      {/* PM conversation content */}
      {!isRoomTab && activePmTab && (
        <>
          <div ref={pmScrollRef} className="flex-1 overflow-auto">
            <div className="flex flex-col gap-2 p-3">
              {!user ? (
                <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
                  Sign in to use private messages.
                </div>
              ) : pmMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <User className="mb-3 size-8 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">Start the conversation with {activePmTab.recipientName}</p>
                </div>
              ) : (
                pmMessages.map((msg) => {
                  const isOwn = msg.sender_id === user?.id
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] rounded px-3 py-2 ${
                          isOwn
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-foreground"
                        }`}
                      >
                        <p className="text-xs leading-relaxed">{msg.content}</p>
                        <span className={`mt-0.5 block text-[9px] ${isOwn ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* PM input */}
          {user && (
            <form
              onSubmit={handlePmSubmit}
              className="shrink-0 flex items-center gap-2 border-t border-border bg-card px-3 py-2"
            >
              <input
                ref={pmInputRef}
                type="text"
                value={pmInput}
                onChange={(e) => setPmInput(e.target.value)}
                placeholder={`Message ${activePmTab.recipientName}...`}
                disabled={pmSending}
                maxLength={500}
                className="flex-1 rounded border border-border/40 bg-secondary/30 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none disabled:opacity-50 font-mono"
              />
              <button
                type="submit"
                disabled={!pmInput.trim() || pmSending}
                className="flex size-7 items-center justify-center rounded bg-primary text-primary-foreground transition-colors hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="size-3.5" />
              </button>
            </form>
          )}
        </>
      )}
    </div>
  )
}
