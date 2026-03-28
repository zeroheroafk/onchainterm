"use client"
import { useState, useEffect, useCallback, createContext, useContext } from "react"
import { TrendingUp, Star, Newspaper, Calculator, Copy, ExternalLink } from "lucide-react"

interface CoinContextMenuState {
  x: number
  y: number
  coinId: string
  coinSymbol: string
  visible: boolean
}

interface CoinContextMenuContextValue {
  showMenu: (e: React.MouseEvent, coinId: string, coinSymbol: string) => void
}

const CoinContextMenuContext = createContext<CoinContextMenuContextValue>({
  showMenu: () => {},
})

export const useCoinContextMenu = () => useContext(CoinContextMenuContext)

export function CoinContextMenuProvider({
  children,
  onSelectSymbol
}: {
  children: React.ReactNode
  onSelectSymbol: (symbol: string) => void
}) {
  const [menu, setMenu] = useState<CoinContextMenuState>({
    x: 0, y: 0, coinId: "", coinSymbol: "", visible: false,
  })

  const showMenu = useCallback((e: React.MouseEvent, coinId: string, coinSymbol: string) => {
    e.preventDefault()
    e.stopPropagation()
    setMenu({ x: e.clientX, y: e.clientY, coinId, coinSymbol, visible: true })
  }, [])

  const hideMenu = useCallback(() => {
    setMenu(prev => ({ ...prev, visible: false }))
  }, [])

  useEffect(() => {
    if (menu.visible) {
      const handler = () => hideMenu()
      document.addEventListener("click", handler)
      document.addEventListener("contextmenu", handler)
      document.addEventListener("scroll", handler, true)
      return () => {
        document.removeEventListener("click", handler)
        document.removeEventListener("contextmenu", handler)
        document.removeEventListener("scroll", handler, true)
      }
    }
  }, [menu.visible, hideMenu])

  const handleAction = (action: string) => {
    switch (action) {
      case "chart":
        onSelectSymbol(menu.coinId)
        break
      case "copy":
        navigator.clipboard.writeText(menu.coinSymbol.toUpperCase())
        break
      case "coingecko":
        window.open(`https://www.coingecko.com/en/coins/${menu.coinId}`, "_blank")
        break
    }
    hideMenu()
  }

  const actions = [
    { id: "chart", label: "Open in Chart", icon: TrendingUp },
    { id: "copy", label: `Copy "${menu.coinSymbol.toUpperCase()}"`, icon: Copy },
    { id: "coingecko", label: "View on CoinGecko", icon: ExternalLink },
  ]

  return (
    <CoinContextMenuContext.Provider value={{ showMenu }}>
      {children}
      {menu.visible && (
        <div
          className="fixed z-[300] min-w-[180px] border border-border/40 bg-card/95 backdrop-blur-md py-1 shadow-2xl shadow-black/30 animate-dropdown font-mono rounded-lg ring-1 ring-white/5"
          style={{
            left: Math.min(menu.x, window.innerWidth - 200),
            top: Math.min(menu.y, window.innerHeight - 200),
          }}
        >
          <div className="px-3 py-1.5 border-b border-border/30">
            <span className="text-[10px] font-semibold text-primary/80 uppercase tracking-[0.1em]">
              {menu.coinSymbol.toUpperCase()}
            </span>
          </div>
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              className="flex w-full items-center gap-2.5 px-3 py-1.5 text-[11px] text-foreground/80 hover:bg-secondary/50 hover:text-foreground transition-colors"
            >
              <action.icon className="size-3 text-muted-foreground/50" />
              {action.label}
            </button>
          ))}
        </div>
      )}
    </CoinContextMenuContext.Provider>
  )
}
