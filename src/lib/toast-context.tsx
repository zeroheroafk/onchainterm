"use client"
import { createContext, useContext, useState, useCallback, useRef } from "react"
import { CheckCircle2, XCircle, Info } from "lucide-react"

interface Toast {
  id: number
  message: string
  type: "success" | "error" | "info"
}

interface ToastContextValue {
  toast: (message: string, type?: "success" | "error" | "info") => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const toast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    const id = ++idRef.current
    setToasts(prev => [...prev.slice(-2), { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500)
  }, [])

  const icons = { success: CheckCircle2, error: XCircle, info: Info }
  const colors = {
    success: "text-green-400 border-green-400/30",
    error: "text-red-400 border-red-400/30",
    info: "text-primary border-primary/30"
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => {
          const Icon = icons[t.type]
          return (
            <div
              key={t.id}
              className={`animate-slide-in pointer-events-auto flex items-center gap-2 rounded border bg-card/95 backdrop-blur-sm px-3 py-2 text-xs font-mono shadow-lg ${colors[t.type]}`}
            >
              <Icon className="size-3.5 shrink-0" />
              <span className="text-foreground">{t.message}</span>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
