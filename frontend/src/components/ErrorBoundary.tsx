import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { btnPrimary } from './ui/primitives'

export default class ErrorBoundary extends React.Component<any, any> {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="border border-danger p-8 my-8 bg-card" role="alert">
          <AlertCircle size={28} className="text-error mb-3" aria-hidden />
          <h2 className="font-display text-2xl font-semibold mb-2">This view failed to load</h2>
          <p className="text-sm text-muted-fg mb-6 max-w-md">
            Switch tabs or try again. The rest of the app is still available.
          </p>
          <button type="button" className={btnPrimary} onClick={() => this.setState({ hasError: false, error: null })}>
            <RefreshCw size={16} aria-hidden /> Try again
          </button>
          {this.state.error && (
            <pre className="mt-6 text-xs font-mono text-muted-fg overflow-x-auto">{String(this.state.error)}</pre>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
