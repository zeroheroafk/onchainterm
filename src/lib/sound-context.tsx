"use client"
import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react"

type SoundType = "alert" | "trade" | "whale" | "success" | "error"

interface SoundContextValue {
  muted: boolean
  toggleMute: () => void
  playSound: (type: SoundType) => void
}

const SoundContext = createContext<SoundContextValue>({
  muted: true,
  toggleMute: () => {},
  playSound: () => {},
})

export const useSound = () => useContext(SoundContext)

// Generate tones using Web Audio API - no audio files needed
function createTone(frequency: number, duration: number, type: OscillatorType = "sine", volume: number = 0.1) {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = frequency
    gain.gain.value = volume
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + duration)
    // Cleanup
    setTimeout(() => ctx.close(), (duration + 0.1) * 1000)
  } catch {}
}

const SOUNDS: Record<SoundType, () => void> = {
  alert: () => {
    createTone(880, 0.15, "sine", 0.08)
    setTimeout(() => createTone(1100, 0.15, "sine", 0.08), 150)
  },
  trade: () => {
    createTone(523, 0.1, "sine", 0.06)
    setTimeout(() => createTone(659, 0.1, "sine", 0.06), 100)
    setTimeout(() => createTone(784, 0.15, "sine", 0.06), 200)
  },
  whale: () => {
    createTone(220, 0.3, "triangle", 0.1)
    setTimeout(() => createTone(165, 0.4, "triangle", 0.08), 300)
  },
  success: () => {
    createTone(660, 0.08, "sine", 0.05)
    setTimeout(() => createTone(880, 0.12, "sine", 0.05), 80)
  },
  error: () => {
    createTone(200, 0.15, "square", 0.04)
    setTimeout(() => createTone(150, 0.2, "square", 0.04), 150)
  },
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [muted, setMuted] = useState(true) // Default muted

  useEffect(() => {
    const stored = localStorage.getItem("onchainterm-sound")
    if (stored === "on") setMuted(false)
  }, [])

  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const next = !prev
      localStorage.setItem("onchainterm-sound", next ? "off" : "on")
      if (!next) {
        // Play a quick test tone when unmuting
        createTone(660, 0.08, "sine", 0.05)
      }
      return next
    })
  }, [])

  const playSound = useCallback((type: SoundType) => {
    if (muted) return
    SOUNDS[type]?.()
  }, [muted])

  return (
    <SoundContext.Provider value={{ muted, toggleMute, playSound }}>
      {children}
    </SoundContext.Provider>
  )
}
