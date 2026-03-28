"use client"

import { useState, useEffect } from "react"

const STORAGE_KEY = "onchainterm_onboarding_done"

interface TourStep {
  title: string
  description: string
}

const STEPS: TourStep[] = [
  {
    title: "Welcome to OnchainTerm",
    description:
      "Your real-time crypto market intelligence terminal. Let's take a quick tour of the key features.",
  },
  {
    title: "Command Bar",
    description:
      "Use Ctrl+K or click here to search and open widgets. Quickly find any tool you need.",
  },
  {
    title: "Draggable Widgets",
    description:
      "Drag any widget to rearrange your workspace. Resize and organize everything to fit your workflow.",
  },
  {
    title: "Click Any Coin",
    description:
      "Click a coin anywhere to open its chart. Dive into price action instantly from any widget.",
  },
  {
    title: "Themes",
    description:
      "Customize your look with 11 themes — from Bloomberg classic to Neon cyberpunk and more.",
  },
  {
    title: "Sign In",
    description:
      "Create an account to save your username in chat and keep your preferences across sessions.",
  },
]

export function OnboardingTour() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "true") {
        setVisible(true)
      }
    } catch {
      // localStorage unavailable
    }
  }, [])

  function finish() {
    try {
      localStorage.setItem(STORAGE_KEY, "true")
    } catch {
      // ignore
    }
    setVisible(false)
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      finish()
    }
  }

  if (!visible) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={finish}
      />

      {/* card */}
      <div className="relative z-10 w-full max-w-sm mx-4 border border-border bg-card rounded-lg shadow-2xl overflow-hidden">
        {/* step indicator bar */}
        <div className="h-1 bg-secondary">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="px-5 pt-5 pb-4">
          {/* step number */}
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            Step {step + 1} of {STEPS.length}
          </p>

          {/* title */}
          <h2 className="text-base font-bold text-foreground mb-2">
            {current.title}
          </h2>

          {/* description */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {current.description}
          </p>
        </div>

        {/* footer */}
        <div className="flex items-center justify-between px-5 pb-4">
          {/* progress dots */}
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`size-2 rounded-full transition-colors ${
                  i === step
                    ? "bg-primary"
                    : i < step
                      ? "bg-primary/40"
                      : "bg-secondary"
                }`}
              />
            ))}
          </div>

          {/* buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={finish}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip
            </button>
            <button
              onClick={next}
              className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
            >
              {isLast ? "Get Started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
