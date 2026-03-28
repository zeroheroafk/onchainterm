"use client"
import { createContext, useContext, useState, useCallback, useRef } from "react"

export type NotificationType = "alert" | "whale" | "liquidation" | "signal" | "system"

export interface Notification {
  id: number
  type: NotificationType
  title: string
  message: string
  timestamp: Date
  read: boolean
}

interface NotificationContextValue {
  notifications: Notification[]
  unreadCount: number
  addNotification: (type: NotificationType, title: string, message: string) => void
  markAllRead: () => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  markAllRead: () => {},
  clearAll: () => {},
})

export const useNotifications = () => useContext(NotificationContext)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const idRef = useRef(0)

  const addNotification = useCallback((type: NotificationType, title: string, message: string) => {
    const id = ++idRef.current
    setNotifications(prev => [
      { id, type, title, message, timestamp: new Date(), read: false },
      ...prev,
    ].slice(0, 50)) // Keep max 50
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAllRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  )
}
