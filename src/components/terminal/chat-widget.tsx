"use client"

import { useState, useRef, useEffect } from "react"
import { Send } from "lucide-react"

interface ChatMessage {
  id: string
  user: string
  text: string
  timestamp: Date
}

export function ChatWidget() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "1", user: "System", text: "Welcome to OnchainTerm Market Chat. Be respectful and stay on topic.", timestamp: new Date() },
    { id: "2", user: "CryptoTrader", text: "BTC looking bullish on the 4H chart", timestamp: new Date(Date.now() - 120000) },
    { id: "3", user: "DeFiAnon", text: "ETH gas fees are finally reasonable today", timestamp: new Date(Date.now() - 60000) },
    { id: "4", user: "WhaleWatcher", text: "Just saw a 500 BTC transfer to Coinbase", timestamp: new Date(Date.now() - 30000) },
  ])
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return
    const msg: ChatMessage = {
      id: `${Date.now()}`,
      user: "You",
      text: input.trim(),
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, msg])
    setInput("")
  }

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-3 space-y-2">
        {messages.map((msg) => (
          <div key={msg.id} className="text-xs">
            <span className="text-[9px] text-muted-foreground">{formatTime(msg.timestamp)}</span>
            {" "}
            <span className={`font-bold ${msg.user === "System" ? "text-amber-400" : msg.user === "You" ? "text-primary" : "text-cyan-400"}`}>
              {msg.user}:
            </span>
            {" "}
            <span className="text-foreground">{msg.text}</span>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-border px-3 py-2 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSend() }}
          placeholder="Type a message..."
          className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/50"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="rounded p-1.5 text-muted-foreground transition-colors hover:text-primary disabled:opacity-30"
        >
          <Send className="size-3.5" />
        </button>
      </div>

      <div className="border-t border-border px-3 py-1 text-[9px] text-muted-foreground shrink-0">
        Local chat preview &middot; Real-time chat requires Supabase setup
      </div>
    </div>
  )
}
