import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

// Fix: Explicitly extend React.Component with defined Props and State interfaces to ensure inherited properties are correctly typed
class GlobalErrorBoundary extends React.Component<Props, State> {
  // Fix: Initialize state as a class property to improve TypeScript property recognition and inheritance visibility
  public state: State = { hasError: false };

  constructor(props: Props) {
    super(props);
  }

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("CRITICAL_SYSTEM_FAILURE:", error, errorInfo);
  }

  public render(): ReactNode {
    // Fix: Access state via this.state which is now properly recognized through explicit React.Component extension
    if (this.state.hasError) {
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

    // Fix: Access props via this.props which is now properly recognized
    return this.props.children;
  }
}

export default GlobalErrorBoundary;
