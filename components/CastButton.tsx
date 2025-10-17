import React, { useState, useEffect } from 'react';

interface CastButtonProps {
  videoElement: HTMLVideoElement | null;
}

const CastButton: React.FC<CastButtonProps> = ({ videoElement }) => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // FIX: The component was using a deprecated and non-standard 'remote.availability' property, which caused a TypeScript error. 
  // This has been updated to use the standard 'remote.watchAvailability()' method from the Remote Playback API. 
  // This modern approach correctly watches for cast device availability and is compliant with web standards.
  useEffect(() => {
    // Check if the Remote Playback API is supported by the browser
    if (!videoElement || !('remote' in videoElement)) {
      return;
    }

    const remote = (videoElement as any).remote;
    let availabilityId: number | undefined;

    // The watchAvailability callback is called immediately with the current state,
    // and then again whenever availability changes. This replaces the need for
    // a separate initial check and an 'availabilitychange' event listener.
    remote.watchAvailability((available: boolean) => {
      setIsAvailable(available);
    }).then((id: number) => {
      availabilityId = id;
    }).catch((err: Error) => {
      console.error("Cannot watch remote playback availability: ", err);
      setIsAvailable(false);
    });
    
    const handleStateChange = () => {
      setConnectionState(remote.state);
    };
    
    // Initial state check
    handleStateChange();

    remote.addEventListener('connect', handleStateChange);
    remote.addEventListener('connecting', handleStateChange);
    remote.addEventListener('disconnect', handleStateChange);

    // Cleanup function
    return () => {
      if (availabilityId !== undefined) {
          // It's good practice to try/catch this as it can fail if the context is gone
          try {
              remote.cancelWatchAvailability(availabilityId);
          } catch(e) {
              console.warn("Could not cancel watch availability", e);
          }
      }
      remote.removeEventListener('connect', handleStateChange);
      remote.removeEventListener('connecting', handleStateChange);
      remote.removeEventListener('disconnect', handleStateChange);
    };
  }, [videoElement]);

  const handleCast = () => {
    if (!videoElement || !('remote' in videoElement)) {
      return;
    }

    (videoElement as any).remote.prompt().catch((err: Error) => {
      // AbortError is expected if the user cancels the prompt.
      if (err.name !== 'AbortError') {
        console.error("Error prompting for remote playback:", err);
      }
    });
  };

  // Do not render the button if the API is not available or no devices are found
  if (!isAvailable) {
    return null;
  }
  
  const iconColor = connectionState === 'connected' ? 'text-red-500' : 'text-white';

  return (
    <button
      onClick={handleCast}
      className={`absolute top-4 right-4 bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors ${iconColor} ${connectionState === 'connecting' ? 'animate-pulse' : ''}`}
      aria-label="Cast to device"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11zm20-7H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h7v-2H3V5h18v3h2V5c0-1.1-.9-2-2-2z" />
      </svg>
    </button>
  );
};

export default CastButton;