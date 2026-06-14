import React from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 m-6 glass-panel border border-cyber-red/30 rounded-2xl bg-cyber-red/5 min-h-[350px] space-y-6">
          <div className="w-16 h-16 rounded-full bg-cyber-red/10 border border-cyber-red/30 flex items-center justify-center text-cyber-red animate-pulse">
            <ShieldAlert size={32} />
          </div>
          <div className="text-center space-y-2 max-w-md">
            <h3 className="text-lg font-bold text-white">Console Runtime Blocked</h3>
            <p className="text-xs text-gray-400">
              An unexpected rendering exception was intercepted while loading this module. Your session is secure.
            </p>
            {this.state.error && (
              <pre className="mt-4 p-3 bg-cyber-darker border border-gray-800 rounded-xl text-[10px] text-cyber-red font-mono overflow-x-auto text-left max-h-24">
                {this.state.error.toString()}
              </pre>
            )}
          </div>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              if (this.props.onReset) this.props.onReset();
            }}
            className="flex items-center gap-2 bg-cyber-red hover:bg-cyber-red/90 text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-neon-red text-xs uppercase tracking-wider"
          >
            <RefreshCw size={14} className="animate-spin-slow" />
            Reload Module
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
