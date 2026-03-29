"use client"

import { useState, useRef, useEffect, useCallback, type FormEvent } from "react"
import {
  Send,
  MessageSquare,
  ChevronLeft,
  User,
  Trash2,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  read: boolean
}

interface Conversation {
  id: string
  participant_1: string
  participant_2: string
  last_message_at: string
  created_at: string
  other_user_id: string
  other_user_name: string
  last_message?: string
  unread_count: number
}

export interface PMRecipient {
  userId: string
  displayName: string
}

interface PrivateMessagesProps {
  initialRecipient?: PMRecipient | null
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  } else if (diffDays === 1) {
    return "Yesterday"
  } else {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }
}

export function PrivateMessages({ initialRecipient }: PrivateMessagesProps) {
  const { user } = useAuth()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const processedRecipientRef = useRef<string | null>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Focus input when selecting conversation
  useEffect(() => {
    if (selectedConversation) {
      inputRef.current?.focus()
    }
  }, [selectedConversation])

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    try {
      const { data: convData, error } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order("last_message_at", { ascending: false })

      if (error || !convData || convData.length === 0) {
        setConversations([])
        setIsLoading(false)
        return
      }

      // Get other users' display names from profiles
      const otherUserIds = convData.map((c: { participant_1: string; participant_2: string }) =>
        c.participant_1 === user.id ? c.participant_2 : c.participant_1
      )

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", otherUserIds)

      const profileMap = new Map(
        profiles?.map((p: { id: string; display_name: string }) => [p.id, p.display_name]) || []
      )

      // Also check chat_messages for usernames as fallback
      const { data: chatUsers } = await supabase
        .from("chat_messages")
        .select("user_id, username")
        .in("user_id", otherUserIds)
        .limit(otherUserIds.length)

      const chatUserMap = new Map(
        chatUsers?.map((u: { user_id: string; username: string }) => [u.user_id, u.username]) || []
      )

      const results = await Promise.allSettled(
        convData.map(async (conv: { id: string; participant_1: string; participant_2: string }) => {
          const otherUserId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1

          const { data: lastMsg } = await supabase
            .from("private_messages")
            .select("content")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single()

          const { count } = await supabase
            .from("private_messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .eq("read", false)
            .neq("sender_id", user.id)

          return {
            ...conv,
            other_user_id: otherUserId,
            other_user_name: profileMap.get(otherUserId) || chatUserMap.get(otherUserId) || "User",
            last_message: lastMsg?.content || "",
            unread_count: count || 0,
          }
        })
      )

      const successfulConversations = results
        .filter((r): r is PromiseFulfilledResult<Conversation> => r.status === "fulfilled")
        .map((r) => r.value)

      setConversations(successfulConversations)
    } catch (err) {
      console.error("fetchConversations error:", err)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from("private_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })

      if (error) return

      if (data) {
        setMessages(data)

        // Mark unread messages as read
        if (user) {
          await supabase
            .from("private_messages")
            .update({ read: true })
            .eq("conversation_id", conversationId)
            .neq("sender_id", user.id)
            .eq("read", false)
        }
      }
    } catch (err) {
      console.error("fetchMessages error:", err)
    }
  }, [user])

  // Find or create conversation with recipient
  const findOrCreateConversation = useCallback(async (recipient: PMRecipient) => {
    if (!user) return

    const { data: existingConv } = await supabase
      .from("conversations")
      .select("*")
      .or(`and(participant_1.eq.${user.id},participant_2.eq.${recipient.userId}),and(participant_1.eq.${recipient.userId},participant_2.eq.${user.id})`)
      .maybeSingle()

    if (existingConv) {
      const conv: Conversation = {
        ...existingConv,
        other_user_id: recipient.userId,
        other_user_name: recipient.displayName,
        unread_count: 0,
      }
      setSelectedConversation(conv)
      await fetchMessages(existingConv.id)
      return
    }

    const { data: newConv, error } = await supabase
      .from("conversations")
      .insert({
        participant_1: user.id,
        participant_2: recipient.userId,
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Create conversation error:", error)
      return
    }

    if (newConv) {
      const conversation: Conversation = {
        ...newConv,
        other_user_id: recipient.userId,
        other_user_name: recipient.displayName,
        last_message: "",
        unread_count: 0,
      }
      setConversations(prev => [conversation, ...prev])
      setSelectedConversation(conversation)
      setMessages([])
    }
  }, [user, fetchMessages])

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      fetchConversations()
    } else {
      setIsLoading(false)
    }
  }, [user, fetchConversations])

  // Handle initial recipient (from chat username click)
  useEffect(() => {
    if (initialRecipient && user) {
      const key = `${initialRecipient.userId}:${initialRecipient.displayName}`
      if (processedRecipientRef.current !== key) {
        processedRecipientRef.current = key
        findOrCreateConversation(initialRecipient)
      }
    }
  }, [initialRecipient, user, findOrCreateConversation])

  // Real-time subscription for new messages
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel("pm_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "private_messages",
        },
        async (payload) => {
          const newMsg = payload.new as Message

          if (selectedConversation && newMsg.conversation_id === selectedConversation.id) {
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })

            // Mark as read if from other user
            if (newMsg.sender_id !== user.id) {
              await supabase
                .from("private_messages")
                .update({ read: true })
                .eq("id", newMsg.id)
            }
          }

          // Refresh conversations list
          fetchConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, selectedConversation, fetchConversations])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !selectedConversation || !user) return

    setIsSending(true)
    const messageContent = input.trim()
    setInput("")

    const { error } = await supabase.from("private_messages").insert({
      conversation_id: selectedConversation.id,
      sender_id: user.id,
      content: messageContent,
      read: false,
    })

    if (error) {
      setInput(messageContent)
    } else {
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", selectedConversation.id)
    }

    setIsSending(false)
    inputRef.current?.focus()
  }

  const handleSelectConversation = async (conv: Conversation) => {
    setSelectedConversation(conv)
    await fetchMessages(conv.id)
    setConversations(prev =>
      prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c)
    )
  }

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await supabase.from("private_messages").delete().eq("conversation_id", convId)
      await supabase.from("conversations").delete().eq("id", convId)

      setConversations(prev => prev.filter(c => c.id !== convId))
      if (selectedConversation?.id === convId) {
        setSelectedConversation(null)
        setMessages([])
      }
    } catch (err) {
      console.error("Delete conversation error:", err)
    }
  }

  const handleBack = () => {
    setSelectedConversation(null)
    setMessages([])
    processedRecipientRef.current = null
    fetchConversations()
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs p-4">
        Sign in to use private messages.
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2 shrink-0">
        <div className="flex items-center gap-2">
          {selectedConversation ? (
            <>
              <button
                onClick={handleBack}
                className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <User className="size-3 text-primary" />
              <span className="text-xs font-bold text-foreground">{selectedConversation.other_user_name}</span>
            </>
          ) : (
            <>
              <MessageSquare className="size-3 text-primary" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-primary">Messages</h2>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {selectedConversation ? (
        <>
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-auto">
            <div className="flex flex-col gap-2 p-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="mb-3 size-8 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">Start the conversation by sending a message</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.sender_id === user.id
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

          {/* Message Input */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border px-3 py-2 shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              disabled={isSending}
              maxLength={500}
              className="flex-1 rounded border border-border bg-secondary/30 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              className="flex size-7 items-center justify-center rounded bg-primary text-primary-foreground transition-colors hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="size-3.5" />
            </button>
          </form>
        </>
      ) : (
        /* Conversations List */
        <div className="flex-1 overflow-auto">
          <div className="flex flex-col">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <span className="text-xs text-muted-foreground">Loading...</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <MessageSquare className="mb-3 size-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No conversations yet</p>
                <p className="mt-1 text-[10px] text-muted-foreground/60">
                  Click on a username in the chat to start a conversation
                </p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className="group flex items-center border-b border-border/30 transition-colors hover:bg-secondary/30"
                >
                  <button
                    onClick={() => handleSelectConversation(conv)}
                    className="flex flex-1 items-center gap-3 px-3 py-2.5 text-left"
                  >
                    <div className="flex size-8 items-center justify-center rounded-full bg-secondary text-foreground shrink-0">
                      <User className="size-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{conv.other_user_name}</span>
                        <span className="text-[9px] text-muted-foreground">{formatTime(conv.last_message_at)}</span>
                      </div>
                      <p className="truncate text-[10px] text-muted-foreground">{conv.last_message || "No messages yet"}</p>
                    </div>
                    {conv.unread_count > 0 && (
                      <div className="flex size-4.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground shrink-0">
                        {conv.unread_count}
                      </div>
                    )}
                  </button>
                  <button
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className="mr-2 rounded p-1 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
