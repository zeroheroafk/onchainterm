"use client"
import { useState } from "react"
import { Bell, Trash2, CheckCheck, AlertTriangle, Waves, TrendingUp, Zap, Info } from "lucide-react"
import { useNotifications, type NotificationType } from "@/lib/notification-context"
import { getTimestampOpacity } from "@/hooks/useTimestampAge"

const ICONS: Record<NotificationType, typeof Bell> = {
  alert: AlertTriangle,
  whale: Waves,
  liquidation: Zap,
  signal: TrendingUp,
  system: Info,
}

const COLORS: Record<NotificationType, string> = {
  alert: "text-amber-400",
  whale: "text-blue-400",
  liquidation: "text-negative",
  signal: "text-positive",
  system: "text-muted-foreground",
}

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) markAllRead() }}
        className="relative flex items-center gap-1 border border-border/50 px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground rounded-md"
      >
        <Bell className="size-3" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-destructive text-[7px] font-bold text-white animate-pulse shadow-sm shadow-destructive/30">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-72 max-h-80 border border-border/40 bg-card/95 backdrop-blur-md shadow-2xl shadow-black/30 rounded-lg ring-1 ring-white/5 overflow-hidden animate-dropdown">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
              <span className="text-[10px] font-semibold text-foreground uppercase tracking-[0.1em]">Notifications</span>
              <div className="flex gap-1">
                <button onClick={markAllRead} className="text-muted-foreground/40 hover:text-foreground transition-colors" title="Mark all read">
                  <CheckCheck className="size-3" />
                </button>
                <button onClick={clearAll} className="text-muted-foreground/40 hover:text-destructive transition-colors" title="Clear all">
                  <Trash2 className="size-3" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-64">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Bell className="size-6 mb-2 opacity-20" />
                  <span className="text-[10px]">No notifications</span>
                </div>
              ) : (
                notifications.map(n => {
                  const Icon = ICONS[n.type]
                  return (
                    <div key={n.id} className={`flex items-start gap-2 px-3 py-2 border-b border-border/20 hover:bg-secondary/20 transition-colors ${!n.read ? "bg-primary/5" : ""}`}>
                      <Icon className={`size-3.5 shrink-0 mt-0.5 ${COLORS[n.type]}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-foreground truncate">{n.title}</p>
                        <p className="text-[9px] text-muted-foreground truncate">{n.message}</p>
                      </div>
                      <span className={`text-[8px] shrink-0 ${getTimestampOpacity(n.timestamp)}`}>{timeAgo(n.timestamp)}</span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
