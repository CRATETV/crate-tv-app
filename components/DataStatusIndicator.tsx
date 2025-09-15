import React from 'react';

interface DataStatusIndicatorProps {
  source: 'live' | 'fallback' | null;
}

const DataStatusIndicator: React.FC<DataStatusIndicatorProps> = ({ source }) => {
  if (source !== 'fallback') {
    return null; // Don't show anything for live data or while loading
  }

  return (
    <div className="bg-yellow-600 text-white text-center py-1.5 px-4 fixed top-0 w-full z-[101] h-8 flex items-center justify-center text-sm shadow-lg">
      <div className="flex items-center justify-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.257 3.099c.636-1.21 2.852-1.21 3.488 0l6.093 11.628c.633 1.206-.475 2.773-1.744 2.773H3.908c-1.269 0-2.377-1.567-1.744-2.773L8.257 3.099zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
        <span>
          <strong>Offline Mode:</strong> Could not load live content. Displaying a cached version of the site.
        </span>
      </div>
    </div>
  );
};

export default DataStatusIndicator;