"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Bell, BellRing, Plus, Trash2, Volume2, VolumeX, ArrowUp, ArrowDown } from "lucide-react"
import { useMarketData } from "@/lib/market-data-context"
import { useSound } from "@/lib/sound-context"
import { formatPrice } from "@/lib/constants"

interface PriceAlert {
  id: string
  coinId: string
  symbol: string
  targetPrice: number
  direction: "above" | "below"
  triggered: boolean
  createdAt: number
}

const STORAGE_KEY = "onchainterm_alerts"
const NOTIFICATIONS_STORAGE_KEY = "onchainterm_alerts_notifications"

function loadNotificationPref(): boolean {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY)
    return raw === "true"
  } catch { return false }
}

function saveNotificationPref(enabled: boolean) {
  try { localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, String(enabled)) } catch {}
}
const ALERT_SOUND_URL = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgipGJdWBYX3uRmpWAfXd8jZiXj4B3dn6OmZmUhXx5gI6YlpKEe3l/jZeVkoR7eX+Nl5WShHt5f42XlZKEe3l/jZeVkoR7eYA="

function loadAlerts(): PriceAlert[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveAlerts(alerts: PriceAlert[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts)) } catch {}
}

export function AlertsWidget() {
  const { data: marketData } = useMarketData()
  const { playSound: playSoundGlobal } = useSound()
  const [alerts, setAlerts] = useState<PriceAlert[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [symbol, setSymbol] = useState("")
  const [targetPrice, setTargetPrice] = useState("")
  const [direction, setDirection] = useState<"above" | "below">("above")
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const notifiedRef = useRef<Set<string>>(new Set())
  const prevPricesRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    setAlerts(loadAlerts())
    setNotificationsEnabled(loadNotificationPref())
  }, [])

  const toggleNotifications = useCallback(async () => {
    if (notificationsEnabled) {
      setNotificationsEnabled(false)
      saveNotificationPref(false)
      return
    }

    if (typeof Notification === "undefined") return

    if (Notification.permission === "granted") {
      setNotificationsEnabled(true)
      saveNotificationPref(true)
    } else if (Notification.permission === "default") {
      const result = await Notification.requestPermission()
      if (result === "granted") {
        setNotificationsEnabled(true)
        saveNotificationPref(true)
      }
    }
  }, [notificationsEnabled])

  // Check alerts against current prices
  useEffect(() => {
    if (!marketData.length || !alerts.length) return

    let updated = false
    const newAlerts = alerts.map(alert => {
      if (alert.triggered) return alert
      const coin = marketData.find(c => c.id === alert.coinId || c.symbol.toLowerCase() === alert.symbol.toLowerCase())
      if (!coin) return alert

      const currentPrice = coin.current_price
      const prevPrice = prevPricesRef.current.get(coin.id) ?? currentPrice

      const shouldTrigger =
        (alert.direction === "above" && prevPrice < alert.targetPrice && currentPrice >= alert.targetPrice) ||
        (alert.direction === "below" && prevPrice > alert.targetPrice && currentPrice <= alert.targetPrice)

      if (shouldTrigger && !notifiedRef.current.has(alert.id)) {
        updated = true
        notifiedRef.current.add(alert.id)

        // Browser notification
        if (notificationsEnabled && typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification(`Price Alert: ${alert.symbol.toUpperCase()}`, {
            body: `${alert.symbol.toUpperCase()} crossed ${formatPrice(alert.targetPrice)} (${alert.direction} target)`,
            icon: coin.image || undefined,
          })
        }

        // Sound (local widget toggle)
        if (soundEnabled) {
          try {
            if (!audioRef.current) audioRef.current = new Audio(ALERT_SOUND_URL)
            audioRef.current.play().catch(() => {})
          } catch {}
        }

        // Global sound system
        playSoundGlobal("alert")

        return { ...alert, triggered: true }
      }
      return alert
    })

    if (updated) {
      setAlerts(newAlerts)
      saveAlerts(newAlerts)
    }

    // Update previous prices for crossing detection on next tick
    for (const coin of marketData) {
      prevPricesRef.current.set(coin.id, coin.current_price)
    }
  }, [marketData, alerts, soundEnabled, notificationsEnabled, playSoundGlobal])

  const addAlert = useCallback(() => {
    const sym = symbol.trim()
    const price = parseFloat(targetPrice)
    if (!sym || !price || price <= 0) return

    const coin = marketData.find(c => c.symbol.toLowerCase() === sym.toLowerCase())
    const alert: PriceAlert = {
      id: `${Date.now()}`,
      coinId: coin?.id || sym.toLowerCase(),
      symbol: sym.toUpperCase(),
      targetPrice: price,
      direction,
      triggered: false,
      createdAt: Date.now(),
    }
    const updated = [...alerts, alert]
    setAlerts(updated)
    saveAlerts(updated)
    setSymbol(""); setTargetPrice("")
    setShowAdd(false)
  }, [symbol, targetPrice, direction, alerts, marketData])

  const removeAlert = (id: string) => {
    notifiedRef.current.delete(id)
    const updated = alerts.filter(a => a.id !== id)
    setAlerts(updated)
    saveAlerts(updated)
  }

  const clearTriggered = () => {
    const updated = alerts.filter(a => !a.triggered)
    setAlerts(updated)
    saveAlerts(updated)
  }

  const activeAlerts = alerts.filter(a => !a.triggered)
  const triggeredAlerts = alerts.filter(a => a.triggered)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <BellRing className="size-3.5 text-amber-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Price Alerts</span>
          {activeAlerts.length > 0 && (
            <span className="text-[9px] text-primary font-medium">{activeAlerts.length} active</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleNotifications}
            className="relative rounded p-1 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
            title={notificationsEnabled ? "Disable notifications" : "Enable notifications"}
          >
            <Bell className="size-3" />
            <span
              className={`absolute top-0.5 right-0.5 size-1.5 rounded-full transition-colors ${
                notificationsEnabled ? "bg-green-400" : "bg-muted-foreground/40"
              }`}
            />
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
            title={soundEnabled ? "Mute alerts" : "Unmute alerts"}
          >
            {soundEnabled ? <Volume2 className="size-3" /> : <VolumeX className="size-3" />}
          </button>
        </div>
      </div>

      {/* Alert list */}
      <div className="flex-1 overflow-auto min-h-0">
        {alerts.length === 0 && !showAdd ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs gap-2 p-4">
            <BellRing className="size-8 opacity-20" />
            <span>No price alerts set</span>
            <span className="text-[9px]">Get notified when a coin hits your target price</span>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {/* Active alerts */}
            {activeAlerts.map(alert => {
              const coin = marketData.find(c => c.id === alert.coinId || c.symbol.toLowerCase() === alert.symbol.toLowerCase())
              const currentPrice = coin?.current_price
              const progress = currentPrice && alert.direction === "above"
                ? Math.min(100, (currentPrice / alert.targetPrice) * 100)
                : currentPrice && alert.direction === "below"
                ? Math.min(100, (alert.targetPrice / currentPrice) * 100)
                : 0

              return (
                <div key={alert.id} className="px-3 py-2 group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-foreground">{alert.symbol}</span>
                      <span className={`flex items-center gap-0.5 text-[9px] font-medium px-1 rounded ${
                        alert.direction === "above" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                      }`}>
                        {alert.direction === "above" ? <ArrowUp className="size-2.5" /> : <ArrowDown className="size-2.5" />}
                        {alert.direction}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono text-primary">{formatPrice(alert.targetPrice)}</span>
                      <button
                        onClick={() => removeAlert(alert.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-red-400 transition-all"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                  {currentPrice && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary/50 rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-[9px] text-muted-foreground font-mono">{formatPrice(currentPrice)}</span>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Triggered alerts */}
            {triggeredAlerts.length > 0 && (
              <>
                <div className="px-3 py-1.5 flex items-center justify-between bg-secondary/10">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Triggered</span>
                  <button onClick={clearTriggered} className="text-[9px] text-muted-foreground hover:text-primary">Clear all</button>
                </div>
                {triggeredAlerts.map(alert => (
                  <div key={alert.id} className="px-3 py-2 opacity-60 group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold">{alert.symbol}</span>
                        <span className="text-[9px] text-green-400">✓ Triggered</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono line-through">{formatPrice(alert.targetPrice)}</span>
                        <button
                          onClick={() => removeAlert(alert.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-red-400 transition-all"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Add form */}
      <div className="border-t border-border px-3 py-2 shrink-0">
        {showAdd ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <input value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="BTC" className="w-16 rounded border border-border bg-background px-1.5 py-1 text-[10px] outline-none focus:border-primary/40" />
              <div className="flex rounded overflow-hidden border border-border">
                <button
                  onClick={() => setDirection("above")}
                  className={`px-2 py-1 text-[9px] font-bold ${direction === "above" ? "bg-green-500/20 text-green-400" : "text-muted-foreground"}`}
                >↑ Above</button>
                <button
                  onClick={() => setDirection("below")}
                  className={`px-2 py-1 text-[9px] font-bold ${direction === "below" ? "bg-red-500/20 text-red-400" : "text-muted-foreground"}`}
                >↓ Below</button>
              </div>
              <input value={targetPrice} onChange={e => setTargetPrice(e.target.value)} placeholder="Price" type="number" className="w-20 rounded border border-border bg-background px-1.5 py-1 text-[10px] outline-none focus:border-primary/40" />
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={addAlert} className="rounded bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground hover:bg-primary/90">Set Alert</button>
              <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground text-[10px]">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary transition-colors">
            <Plus className="size-3" /> Add price alert
          </button>
        )}
      </div>
    </div>
  )
}
