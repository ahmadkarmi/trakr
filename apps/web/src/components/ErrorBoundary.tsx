import React from 'react'

type ErrorBoundaryState = { hasError: boolean; error?: unknown }

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: unknown, info: unknown) {
    // TODO: send to monitoring (e.g., Sentry)
    console.error('ErrorBoundary caught an error', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-lg w-full border rounded p-6 bg-white shadow">
            <h1 className="text-xl font-semibold text-gray-900">Something went wrong</h1>
            <p className="mt-2 text-gray-600">An unexpected error occurred. Try reloading the page. If the problem persists, contact support.</p>
            <div className="mt-4">
              <button className="btn-primary" onClick={() => window.location.reload()}>Reload</button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
