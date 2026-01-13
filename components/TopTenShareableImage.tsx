
import React from 'react';

interface FilmData {
  key: string;
  title: string;
  poster?: string;
}

interface TopTenShareableImageProps {
  topFilms: FilmData[];
  date: string;
}

const TopTenShareableImage: React.FC<TopTenShareableImageProps> = ({ topFilms, date }) => {
  const containerStyle: React.CSSProperties = {
    width: '1080px',
    height: '1920px',
    fontFamily: "'Inter', sans-serif",
    backgroundColor: '#050505',
    position: 'relative',
    overflow: 'hidden'
  };

  return (
    <div style={containerStyle} className="text-white p-16 flex flex-col">
      {/* Cinematic Background Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.12)_0%,transparent_60%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.08)_0%,transparent_60%)]"></div>
      
      {/* Film Grain / Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.15] pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')]"></div>
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
      
      {/* Deep Vignette */}
      <div className="absolute inset-0 shadow-[inset_0_0_300px_rgba(0,0,0,0.9)] pointer-events-none"></div>
      
      {/* Header */}
      <div className="flex justify-between items-start mb-20 relative z-10">
        <div className="flex items-center gap-6">
            <img 
              src={`/api/proxy-image?url=${encodeURIComponent("https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png")}`} 
              alt="Crate TV Logo" 
              className="w-48 invert brightness-0 opacity-80" 
              crossOrigin="anonymous" 
            />
            <div className="h-12 w-px bg-white/10"></div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-[0.8em] text-gray-500">Official Dispatch</p>
                <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-red-600 mt-1">Infrastructure V4.0</p>
            </div>
        </div>
        <div className="text-right">
          <h1 className="text-9xl font-black tracking-tighter leading-[0.75] italic text-white">TOP 10<br/><span className="text-red-600">TODAY.</span></h1>
          <p className="text-2xl font-bold text-gray-700 uppercase tracking-[0.4em] mt-6">{date}</p>
        </div>
      </div>

      {/* List */}
      <div className="flex-grow space-y-5 relative z-10">
        {topFilms.map((film, index) => (
          <div key={film.key} className="flex items-center gap-10 bg-white/[0.02] border border-white/5 p-5 rounded-[2.5rem] shadow-2xl overflow-hidden relative group">
            {/* Massive Rank Number with Stroke */}
            <div className="absolute left-6 top-1/2 -translate-y-1/2 opacity-[0.04] pointer-events-none">
                <span className="text-[16rem] font-black italic tracking-tighter" style={{ WebkitTextStroke: '2px white', color: 'transparent' }}>{index + 1}</span>
            </div>
            
            <div className="flex items-center justify-center w-28 flex-shrink-0 relative z-10">
                <span className="text-6xl font-black text-red-600 italic">#{index + 1}</span>
            </div>
            
            <div className="relative w-28 h-40 flex-shrink-0 rounded-2xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.8)] border border-white/10">
                <img 
                  src={film.poster ? `/api/proxy-image?url=${encodeURIComponent(film.poster)}` : ''} 
                  alt={film.title} 
                  className="w-full h-full object-cover" 
                  crossOrigin="anonymous" 
                />
            </div>
            
            <div className="flex-grow min-w-0 relative z-10">
                <h2 className="text-5xl font-black uppercase tracking-tighter italic truncate leading-none mb-3">{film.title}</h2>
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-[11px] font-black uppercase text-gray-500 tracking-[0.4em]">Streaming Now // Global Node</span>
                </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Footer */}
      <div className="text-center mt-16 flex-shrink-0 relative z-10">
        <div className="inline-flex flex-col items-center gap-4">
            <div className="bg-red-600 text-white font-black px-12 py-5 rounded-3xl shadow-2xl">
                <p className="text-4xl font-black tracking-[0.4em]">WWW.CRATETV.NET</p>
            </div>
            <div className="space-y-1">
                <p className="text-[11px] font-black uppercase tracking-[1em] text-gray-700 mr-[-1em]">Digital Distribution Afterlife</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.5em] text-gray-800">Powered by Crate Studio Infrastructure</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default TopTenShareableImage;
