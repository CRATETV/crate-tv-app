import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * GlobalErrorBoundary handles uncaught errors in the component tree.
 * Inherits from React.Component with generic Props and State to ensure type safety.
 */
// FIX: Explicitly extending React.Component to resolve issues where this.props was not correctly recognized by TypeScript.
class GlobalErrorBoundary extends React.Component<Props, State> {
  // FIX: Explicitly define the initial state for the component using the State interface.
  public state: State = { hasError: false };

  constructor(props: Props) {
    super(props);
  }

  // FIX: Standard static method definition for Error Boundary to update state when an error occurs.
  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  // FIX: Standard lifecycle method definition for capturing error details for system monitoring.
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to the console for infrastructure monitoring
    console.error("CRITICAL_SYSTEM_FAILURE:", error, errorInfo);
  }

  // FIX: Standard render method definition.
  public render(): ReactNode {
    // FIX: Destructuring children and hasError from this.props and this.state which are now correctly inherited.
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