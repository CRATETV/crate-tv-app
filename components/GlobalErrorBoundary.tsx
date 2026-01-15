
import React, { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * GlobalErrorBoundary handles uncaught errors in the component tree.
 * Inherits from React.Component with generic Props and State to ensure type safety.
 */
// Fix: Using React.Component instead of a destructured import to ensure better type resolution for inherited members in some TypeScript environments.
class GlobalErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Fix: Initializing state as a class property instead of inside the constructor to provide explicit type alignment for the 'state' member.
  public state: ErrorBoundaryState = {
    hasError: false
  };

  // Static method to update state when an error occurs.
  public static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  // Method to log error information.
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("CRITICAL_SYSTEM_FAILURE:", error, errorInfo);
  }

  public render(): ReactNode {
    // Fix: Accessing props and state from the React.Component base class. Explicitly inheriting with generic parameters ensures these are available to the compiler.
    const { children } = this.props;
    const { hasError } = this.state;

    if (hasError) {
      return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-8 text-center relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.05)_0%,transparent_70%)]"></div>
            <div className="relative z-10 space-y-8 max-w-lg">
                <img 
                    src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" 
                    className="w-40 mx-auto opacity-20" 
                    alt="Crate" 
                />
                <div className="space-y-2">
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">Sector Offline</h2>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Sector Identification: CRITICAL_ERROR_D_7</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                    <p className="text-sm text-gray-400 leading-relaxed">The application encountered an isolated logic error. Our automated engineering core has been notified.</p>
                </div>
                <button 
                    onClick={() => window.location.href = '/'}
                    className="bg-red-600 text-white font-black px-12 py-4 rounded-2xl uppercase tracking-widest text-xs shadow-2xl hover:bg-red-500 transition-all active:scale-95"
                >
                    Re-Establish Connection
                </button>
            </div>
        </div>
      );
    }

    return children;
  }
}

export default GlobalErrorBoundary;
