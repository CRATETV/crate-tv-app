import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Global Error Boundary component to catch rendering errors and show a fallback UI.
 * Refactored to use standard class properties to ensure TypeScript recognition.
 */
class GlobalErrorBoundary extends Component<Props, State> {
  // Fix: Explicitly declare props as a class property to resolve "Property 'props' does not exist on type 'GlobalErrorBoundary'" errors.
  public props: Props;

  // Fix: Explicitly declare state as a class property to resolve "Property 'state' does not exist on type 'GlobalErrorBoundary'" errors.
  public state: State = {
    hasError: false
  };

  constructor(props: Props) {
    super(props);
    // Fix: Manually assign props to ensure availability in the specific TypeScript execution context.
    this.props = props;
  }

  // The static method is called during the "render" phase, so side-effects are not permitted.
  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error for infrastructure monitoring
    console.error("CRITICAL_SYSTEM_FAILURE:", error, errorInfo);
  }

  public render(): ReactNode {
    // Fix: Access the explicitly declared state property.
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-8 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.05)_0%,transparent_70%)]"></div>
            <div className="relative z-10 space-y-8 max-w-lg">
                <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" className="w-40 mx-auto opacity-20" alt="Crate" />
                <div className="space-y-2">
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">Sector Offline</h2>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Encryption mismatch or stream interruption detected.</p>
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

    // Fix: Access props property which is inherited from Component<Props, State>.
    return this.props.children;
  }
}

export default GlobalErrorBoundary;