import React from 'react';

interface StagingBannerProps {
    onExit: () => void;
    isOffline?: boolean;
}

const StagingBanner: React.FC<StagingBannerProps> = ({ onExit, isOffline }) => {
  return (
    <div>
      <p>Staging Banner (Offline: {isOffline ? 'Yes' : 'No'})</p>
      <button onClick={onExit}>Exit</button>
    </div>
  );
};

export default StagingBanner;
