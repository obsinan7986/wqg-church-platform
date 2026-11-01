import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary caught an error]:', error, errorInfo);
  }

  handleReload = () => {
    try {
      if (window.caches) {
        caches.keys().then((names) => {
          for (const name of names) caches.delete(name);
        });
      }
    } catch (_) {}
    const url = new URL(window.location.href);
    url.searchParams.set('_t', Date.now().toString());
    window.location.replace(url.toString());
  };

  handleGoHome = () => {
    window.location.href = '/?_t=' + Date.now().toString();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-royal-tint text-slate-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-royal-tint border-2 border-gold-400 flex items-center justify-center mx-auto text-gold-500 shadow-md">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-royal">
                Dogongora Uumameera
              </h2>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                ይቅርታ፣ ያልተጠበቀ ስህተት ተከስቷል። እባክዎ ገጹን እንደገና ይጫኑ ወይም ወደ ዋናው ገጽ ይመለሱ።
              </p>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                An unexpected error occurred. Please refresh or return to home.
              </p>
            </div>

            {/* Error Message Details in Development */}
            {this.state.error && (
              <div className="text-left bg-red-50 border border-red-200 rounded-xl p-3 text-[11px] font-mono text-red-600 max-h-32 overflow-y-auto">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-royal font-black text-xs shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-gold-400"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Haaromsi (Refresh)</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-royal hover:bg-royal-dark text-white font-bold text-xs shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-royal/50"
              >
                <Home className="w-4 h-4" />
                <span>Gara Jalqabaatti (Home)</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
