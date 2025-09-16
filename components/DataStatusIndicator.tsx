import React from 'react';

interface DataStatusIndicatorProps {
  source: 'live' | 'fallback' | null;
}

const DataStatusIndicator: React.FC<DataStatusIndicatorProps> = ({ source }) => {
  // Per user request, this banner is now permanently hidden.
  return null;
};

export default DataStatusIndicator;