
import React from 'react';

interface UpdateBannerProps {
  onRefresh: () => void;
  onDismiss: () => void;
}

const UpdateBanner: React.FC<UpdateBannerProps> = ({ onRefresh, onDismiss }) => {
  const handleRefresh = () => {
    // Force a clean reload to clear the service worker cache
    onDismiss();
    window.location.reload();
  };

  return (
    <div 
        className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-[110] bg-red-600 text-white p-5 rounded-2xl shadow-[0_20px_50px_rgba(239,68,68,0.4)] flex items-center gap-5 animate-[slideInUp_0.6s_cubic-bezier(0.34,1.56,0.64,1)]"
        role="alert"
    >
      <div className="flex-grow">
        <h3 className="font-black uppercase tracking-tighter text-sm">System Update</h3>
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-1">New infrastructure layers ready.</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          onClick={handleRefresh}
          className="bg-white text-red-600 font-black px-6 py-2 rounded-xl text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
        >
          Refresh
        </button>
      </div>
    </div>
  );
};

export default UpdateBanner;
