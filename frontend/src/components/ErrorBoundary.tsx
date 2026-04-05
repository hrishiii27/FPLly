import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

class ErrorBoundary extends React.Component<any, any> {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center p-12 bg-red-50 border border-red-200 rounded-xl my-8">
                    <AlertCircle size={48} className="text-red-500 mb-4" />
                    <h2 className="text-xl font-bold text-red-700 mb-2">Something went wrong</h2>
                    <p className="text-red-600/80 text-sm mb-6 text-center max-w-md">
                        The application encountered an unexpected error while loading this view. You can try refreshing or selecting a different tab from the sidebar.
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false })}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors border border-transparent focus:ring-2 focus:ring-red-500 focus:outline-none"
                    >
                        <RefreshCw size={16} /> Try Again
                    </button>
                    {this.state.error && (
                        <div className="mt-8 p-4 bg-white rounded border border-red-200 w-full max-w-2xl overflow-x-auto text-xs font-mono text-red-800 opacity-70">
                            {this.state.error.toString()}
                        </div>
                    )}
                </div>
            )
        }

        return <>{this.props.children}</>
    }
}

export default ErrorBoundary
