
import React, { Component, ErrorInfo, ReactNode } from 'react';

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
// Fix: Inherit from Component and specify generics to ensure 'props' and 'state' are correctly typed and recognized by the compiler
class GlobalErrorBoundary extends Component<Props, State> {
  // Fix: Initializing state correctly using the State interface
  public state: State = { hasError: false };

  // Explicit constructor call to correctly initialize base class props
  constructor(props: Props) {
    super(props);
  }

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to the console for infrastructure monitoring
    console.error("CRITICAL_SYSTEM_FAILURE:", error, errorInfo);
  }

  public render(): ReactNode {
    // Access hasError from the correctly inherited state object
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-8