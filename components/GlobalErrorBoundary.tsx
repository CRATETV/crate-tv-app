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
// FIX: Use React.Component to ensure inherited properties like 'props' and 'state' are correctly resolved by the TypeScript compiler.
class GlobalErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // FIX: Explicitly defining the constructor ensures 'props' is correctly typed and available on 'this'.
  constructor(props: ErrorBoundaryProps) {
    super(props);
    // FIX: Initializing state via the constructor is more standard for class components in some environments and helps with property resolution.
    this.state = {
      hasError: false
    };
  }

  // Standard static method for Error Boundary to update state when an error occurs.
  public static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  // Standard lifecycle method for capturing error details and logging for monitoring.
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to the console for infrastructure monitoring
    console.error("CRITICAL_SYSTEM_FAILURE:", error, errorInfo);
  }

  public render(): ReactNode {
    // FIX: 'this.props' and 'this.state' are now correctly recognized as members inherited from React.Component.
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
