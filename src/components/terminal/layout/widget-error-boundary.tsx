"use client"

import { Component, type ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface Props {
  widgetTitle: string
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class WidgetErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-muted-foreground">
          <AlertTriangle className="size-8 text-yellow-500/70" />
          <p className="text-xs text-center">
            <span className="font-semibold">{this.props.widgetTitle}</span> failed to load
          </p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs transition-colors hover:bg-secondary hover:text-foreground"
          >
            <RefreshCw className="size-3" />
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
