/\/ ErrorBoundary component
import React, { Component, ErrorInfo, ReactNode } from 'react';
interface Props { children: ReactNode; section?: string; fallback?: ReactNode; silent?: boolean; }
interface State { hasError: boolean; }
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(): State { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[CrateTV:${this.props.section || 'unknown'}]`, error.message, info.componentStack?.split('\n')[1]);
  }
  handleRetry = () => this.setState({ hasError: false });
  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    if (this.props.silent) return null;
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <p className="text-gray-600 text-xs uppercase tracking-widest font-black">{this.props.section ? `${this.props.section} unavailable` : 'Something went wrong'}</p>
          <button onClick={this.handleRetry} className="text-xs text-gray-700 hover:text-white underline underline-offset-4 transition-colors">Try again</button>
        </div>
      </div>
    );
  }
}
export default ErrorBoundary;
