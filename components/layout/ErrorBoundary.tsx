"use client"

import { Component, ErrorInfo, ReactNode } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center bg-[var(--surface)] p-6">
            <div className="card-surface p-8 max-w-md text-center">
              <h2 className="headline-sm text-[var(--error)] mb-2">Something went wrong</h2>
              <p className="body-md text-[var(--on-surface-variant)]">{this.state.error?.message || "An unexpected error occurred."}</p>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="mt-4 px-6 py-3 bg-[var(--secondary)] text-[var(--on-secondary)] rounded-xl font-semibold"
              >
                Try Again
              </button>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}
