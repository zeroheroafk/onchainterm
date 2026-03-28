"use client"
import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react"

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
  requestPermission: () => void
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  markAllRead: () => {},
  clearAll: () => {},
  requestPermission: () => {},
})

export const useNotifications = () => useContext(NotificationContext)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const idRef = useRef(0)

  const requestPermission = useCallback(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const addNotification = useCallback((type: NotificationType, title: string, message: string) => {
    const id = ++idRef.current
    setNotifications(prev => [
      { id, type, title, message, timestamp: new Date(), read: false },
      ...prev,
    ].slice(0, 50)) // Keep max 50

    // Send desktop notification if permitted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: message,
          icon: '/favicon.ico',
          tag: `onchainterm-${id}`,
          silent: true, // We have our own sounds
        })
      } catch {}
    }
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    // Auto-request after a delay to not be intrusive
    const timeout = setTimeout(() => {
      requestPermission()
    }, 10000) // Ask after 10 seconds
    return () => clearTimeout(timeout)
  }, [requestPermission])

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAllRead, clearAll, requestPermission }}>
      {children}
    </NotificationContext.Provider>
  )
}
