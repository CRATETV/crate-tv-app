import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * GlobalErrorBoundary handles uncaught errors in the component tree.
 * Inherits from Component with generic Props and State to ensure type safety.
 */
// Fixed: Explicitly extending React.Component from the React namespace to ensure 'props' and 'state' are correctly inherited and recognized by the compiler.
class GlobalErrorBoundary extends React.Component<Props, State> {
  // Fixed: Initializing state within the class structure.
  public state: State = { hasError: false };

  constructor(props: Props) {
    super(props);
  }

  // Fixed: Standard static method definition for Error Boundary to update state when an error occurs.
  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  // Fixed: Standard lifecycle method for capturing error details. Removed 'override' as the compiler was failing to recognize the inheritance relationship correctly.
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to the console for infrastructure monitoring
    console.error("CRITICAL_SYSTEM_FAILURE:", error, errorInfo);
  }

  // Fixed: Standard render method. Removed 'override' as the compiler was failing to recognize the inheritance relationship correctly.
  public render(): ReactNode {
    // Fixed: 'this.props' and 'this.state' are now correctly recognized as inherited from the React.Component base class.
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