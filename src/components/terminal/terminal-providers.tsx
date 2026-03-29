"use client"

import type { ReactNode } from "react"
import { ThemeProvider } from "@/lib/theme-context"
import { MarketDataProvider } from "@/lib/market-data-context"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { SoundProvider } from "@/lib/sound-context"
import { NotificationProvider } from "@/lib/notification-context"
import { LayoutProvider } from "@/components/terminal/layout/layout-context"

function AuthenticatedLayoutProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return (
    <LayoutProvider userId={user?.id}>
      {children}
    </LayoutProvider>
  )
}

export function TerminalProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <SoundProvider>
        <NotificationProvider>
        <AuthProvider>
          <MarketDataProvider>
            <AuthenticatedLayoutProvider>
              {children}
            </AuthenticatedLayoutProvider>
          </MarketDataProvider>
        </AuthProvider>
        </NotificationProvider>
      </SoundProvider>
    </ThemeProvider>
  )
}
