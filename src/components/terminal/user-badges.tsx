"use client"

import { useState, useMemo } from "react"
import {
  Footprints,
  MessageSquare,
  TrendingUp,
  Eye,
  Bell,
  Radio,
  Shield,
  Zap,
  Fish,
  Diamond,
  Lock,
  Award,
  Star,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import type { LucideIcon } from "lucide-react"

const ACTIVITY_KEY = "onchainterm_activity"

interface ActivityData {
  messages_sent: number
  trades_logged: number
  alerts_created: number
  widgets_opened: number
  days_active: number
  signals_posted: number
}

const DEFAULT_ACTIVITY: ActivityData = {
  messages_sent: 0,
  trades_logged: 0,
  alerts_created: 0,
  widgets_opened: 0,
  days_active: 0,
  signals_posted: 0,
}

interface BadgeDef {
  id: string
  name: string
  description: string
  icon: LucideIcon
  requirement: string
  check: (a: ActivityData) => boolean
  progress: (a: ActivityData) => { current: number; target: number }
}

const BADGES: BadgeDef[] = [
  {
    id: "first_steps",
    name: "First Steps",
    description: "Open 3 widgets",
    icon: Footprints,
    requirement: "Open 3 widgets",
    check: (a) => a.widgets_opened >= 3,
    progress: (a) => ({ current: Math.min(a.widgets_opened, 3), target: 3 }),
  },
  {
    id: "chatterbox",
    name: "Chatterbox",
    description: "Send 10 messages",
    icon: MessageSquare,
    requirement: "Send 10 messages",
    check: (a) => a.messages_sent >= 10,
    progress: (a) => ({ current: Math.min(a.messages_sent, 10), target: 10 }),
  },
  {
    id: "trader",
    name: "Trader",
    description: "Log 5 trades",
    icon: TrendingUp,
    requirement: "Log 5 trades",
    check: (a) => a.trades_logged >= 5,
    progress: (a) => ({ current: Math.min(a.trades_logged, 5), target: 5 }),
  },
  {
    id: "watchful_eye",
    name: "Watchful Eye",
    description: "Add 10 coins to watchlist",
    icon: Eye,
    requirement: "Add 10 coins to watchlist",
    check: (a) => (a as ActivityData & { watchlist_added?: number }).watchlist_added !== undefined
      ? ((a as ActivityData & { watchlist_added?: number }).watchlist_added ?? 0) >= 10
      : false,
    progress: (a) => ({
      current: Math.min((a as ActivityData & { watchlist_added?: number }).watchlist_added ?? 0, 10),
      target: 10,
    }),
  },
  {
    id: "alert_master",
    name: "Alert Master",
    description: "Create 5 alerts",
    icon: Bell,
    requirement: "Create 5 alerts",
    check: (a) => a.alerts_created >= 5,
    progress: (a) => ({ current: Math.min(a.alerts_created, 5), target: 5 }),
  },
  {
    id: "signal_provider",
    name: "Signal Provider",
    description: "Post 10 signals",
    icon: Radio,
    requirement: "Post 10 signals",
    check: (a) => a.signals_posted >= 10,
    progress: (a) => ({ current: Math.min(a.signals_posted, 10), target: 10 }),
  },
  {
    id: "veteran",
    name: "Veteran",
    description: "Active for 7 days",
    icon: Shield,
    requirement: "Be active for 7 days",
    check: (a) => a.days_active >= 7,
    progress: (a) => ({ current: Math.min(a.days_active, 7), target: 7 }),
  },
  {
    id: "power_user",
    name: "Power User",
    description: "Active for 30 days",
    icon: Zap,
    requirement: "Be active for 30 days",
    check: (a) => a.days_active >= 30,
    progress: (a) => ({ current: Math.min(a.days_active, 30), target: 30 }),
  },
  {
    id: "whale",
    name: "Whale",
    description: "Portfolio value > $100k",
    icon: Fish,
    requirement: "Portfolio value exceeds $100,000",
    check: (a) => ((a as ActivityData & { portfolio_value?: number }).portfolio_value ?? 0) > 100000,
    progress: (a) => ({
      current: Math.min((a as ActivityData & { portfolio_value?: number }).portfolio_value ?? 0, 100000),
      target: 100000,
    }),
  },
  {
    id: "diamond_hands",
    name: "Diamond Hands",
    description: "Hold same portfolio 30 days",
    icon: Diamond,
    requirement: "Hold the same portfolio for 30 days",
    check: (a) => ((a as ActivityData & { hold_days?: number }).hold_days ?? 0) >= 30,
    progress: (a) => ({
      current: Math.min((a as ActivityData & { hold_days?: number }).hold_days ?? 0, 30),
      target: 30,
    }),
  },
]

function calculateXP(a: ActivityData): number {
  return (
    a.messages_sent * 5 +
    a.trades_logged * 20 +
    a.alerts_created * 10 +
    a.signals_posted * 15 +
    a.days_active * 50
  )
}

function calculateLevel(xp: number): number {
  return Math.min(Math.floor(Math.sqrt(xp / 100)) + 1, 50)
}

function xpForLevel(level: number): number {
  return (level - 1) * (level - 1) * 100
}

function getLevelTitle(level: number): string {
  if (level <= 5) return "Newbie"
  if (level <= 10) return "Apprentice"
  if (level <= 18) return "Trader"
  if (level <= 25) return "Pro"
  if (level <= 35) return "Expert"
  if (level <= 45) return "Master"
  return "Legend"
}

function getLevelColor(level: number): string {
  if (level <= 5) return "text-muted-foreground/70"
  if (level <= 10) return "text-positive"
  if (level <= 18) return "text-primary"
  if (level <= 25) return "text-purple-400"
  if (level <= 35) return "text-amber-400"
  if (level <= 45) return "text-orange-400"
  return "text-negative"
}

const ACTIVITY_LABELS: Record<keyof ActivityData, string> = {
  messages_sent: "Messages Sent",
  trades_logged: "Trades Logged",
  alerts_created: "Alerts Created",
  widgets_opened: "Widgets Opened",
  days_active: "Days Active",
  signals_posted: "Signals Posted",
}

export function UserBadges() {
  const { user, username } = useAuth()
  const [activity] = useState<ActivityData>(() => {
    try {
      const stored = localStorage.getItem(ACTIVITY_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return { ...DEFAULT_ACTIVITY, ...parsed }
      }
    } catch {
      // ignore parse errors
    }
    return DEFAULT_ACTIVITY
  })
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null)

  const xp = useMemo(() => calculateXP(activity), [activity])
  const level = useMemo(() => calculateLevel(xp), [xp])
  const title = useMemo(() => getLevelTitle(level), [level])
  const currentLevelXP = useMemo(() => xpForLevel(level), [level])
  const nextLevelXP = useMemo(() => xpForLevel(Math.min(level + 1, 51)), [level])
  const xpProgress = useMemo(() => {
    const range = nextLevelXP - currentLevelXP
    if (range <= 0) return 100
    return Math.min(((xp - currentLevelXP) / range) * 100, 100)
  }, [xp, currentLevelXP, nextLevelXP])

  const earnedCount = useMemo(
    () => BADGES.filter((b) => b.check(activity)).length,
    [activity]
  )

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto p-3 text-sm">
      {/* Header */}
      <div className="flex items-center gap-2 text-positive">
        <Award className="w-4 h-4" />
        <span className="font-mono font-bold">Badges &amp; Levels</span>
      </div>

      {/* User level card */}
      <div className="border border-border/40 rounded-lg p-3 bg-card/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Star className={`w-5 h-5 ${getLevelColor(level)}`} />
            <span className="font-mono font-bold text-white">
              {username ?? user?.email?.split("@")[0] ?? "Anon"}
            </span>
          </div>
          <span className={`num font-bold ${getLevelColor(level)}`}>
            Lv.{level} {title}
          </span>
        </div>

        {/* XP bar */}
        <div className="mb-1">
          <div className="flex justify-between text-xs text-muted-foreground/50 num mb-1">
            <span>{xp.toLocaleString()} XP</span>
            <span>{level < 50 ? `${nextLevelXP.toLocaleString()} XP` : "MAX"}</span>
          </div>
          <div className="w-full h-2 bg-secondary/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
        </div>

        <div className="flex justify-between text-xs text-muted-foreground/50 num">
          <span>
            {earnedCount}/{BADGES.length} badges
          </span>
          <span>
            {level < 50
              ? `${(nextLevelXP - xp).toLocaleString()} XP to next level`
              : "Max level reached"}
          </span>
        </div>
      </div>

      {/* Activity counters */}
      <div>
        <div className="text-xs text-muted-foreground/50 font-mono uppercase tracking-wider mb-2">
          Your Activity
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(ACTIVITY_LABELS) as (keyof ActivityData)[]).map((key) => (
            <div
              key={key}
              className="flex items-center justify-between px-2 py-1.5 bg-secondary/30 rounded border border-border/40"
            >
              <span className="text-xs text-muted-foreground/60 font-mono">{ACTIVITY_LABELS[key]}</span>
              <span className="text-xs text-white num font-bold">
                {activity[key].toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Badge grid */}
      <div>
        <div className="text-xs text-muted-foreground/50 font-mono uppercase tracking-wider mb-2">
          Badges
        </div>
        <div className="grid grid-cols-2 gap-2">
          {BADGES.map((badge) => {
            const earned = badge.check(activity)
            const prog = badge.progress(activity)
            const isHovered = hoveredBadge === badge.id
            const Icon = badge.icon

            return (
              <div
                key={badge.id}
                className={`relative flex flex-col items-center p-3 rounded-lg border transition-all cursor-default ${
                  earned
                    ? "border-green-500/40 bg-green-950/20"
                    : "border-border/40 bg-secondary/30"
                }`}
                onMouseEnter={() => setHoveredBadge(badge.id)}
                onMouseLeave={() => setHoveredBadge(null)}
              >
                <div className="relative mb-1.5">
                  <Icon
                    className={`w-6 h-6 ${earned ? "text-positive" : "text-muted-foreground/40"}`}
                  />
                  {!earned && (
                    <Lock className="w-3 h-3 text-muted-foreground/50 absolute -bottom-0.5 -right-1" />
                  )}
                </div>
                <span
                  className={`text-xs font-mono text-center leading-tight ${
                    earned ? "text-white" : "text-muted-foreground/50"
                  }`}
                >
                  {badge.name}
                </span>

                {/* Tooltip on hover */}
                {isHovered && (
                  <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-card/50 border border-border/40 rounded-lg shadow-xl pointer-events-none">
                    <div className="text-xs text-white font-mono font-bold mb-1">
                      {badge.name}
                    </div>
                    <div className="text-xs text-muted-foreground/60 font-mono mb-1">
                      {badge.requirement}
                    </div>
                    <div className="w-full h-1.5 bg-border/40 rounded-full overflow-hidden mb-1">
                      <div
                        className={`h-full rounded-full ${
                          earned ? "bg-green-500" : "bg-amber-500"
                        }`}
                        style={{
                          width: `${Math.min((prog.current / prog.target) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground/50 num">
                      {earned
                        ? "Earned!"
                        : `${prog.current} / ${prog.target}`}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
