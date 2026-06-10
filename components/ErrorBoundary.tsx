import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  section?: string;         // label for error logging e.g. "Hero", "Carousel"
  fallback?: ReactNode;     // optional custom fallback UI
  silent?: boolean;         // if true, renders nothing on error (for non-critical sections)
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — catches unhandled render errors in a subtree so one broken
 * component can't blank the entire app. Wrap any section that loads external
 * data (Hero, Carousels, Watch Party, etc.).
 *
 * Usage:
 *   <ErrorBoundary section="Hero">
 *     <Hero ... />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log with section label so you can identify which part failed in Vercel logs
    console.error(`[CrateTV ErrorBoundary${this.props.section ? `:${this.props.section}` : ''}]`, error.message, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    // Custom fallback takes priority
    if (this.props.fallback) return this.props.fallback;

    // Silent mode — non-critical sections just disappear rather than showing an error
    if (this.props.silent) return null;

    // Default fallback — minimal, on-brand, non-disruptive
    return (
      <div className="flex items-center justify-center py-12 px-4">
        <div className="text-center space-y-3">
          <p className="text-gray-600 text-xs uppercase tracking-widest font-black">
            {this.props.section ? `${this.props.section} unavailable` : 'Something went wrong'}
          </p>
          <button
            onClick={this.handleRetry}
            className="text-xs text-gray-700 hover:text-white underline underline-offset-4 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
