
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
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  };

  return (
    <div style={containerStyle} className="text-white p-12">
      {/* Cinematic Background Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.1)_0%,transparent_60%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.05)_0%,transparent_60%)]"></div>
      
      {/* Film Grain / Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.1] pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')]"></div>
      
      {/* Deep Vignette */}
      <div className="absolute inset-0 shadow-[inset_0_0_400px_rgba(0,0,0,1)] pointer-events-none"></div>
      
      {/* Header - Optimized vertical space */}
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className="flex items-center gap-6">
            <img 
              src={`/api/proxy-image?url=${encodeURIComponent("https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png")}`} 
              alt="Crate TV Logo" 
              className="w-32 invert brightness-0 opacity-80" 
              crossOrigin="anonymous" 
            />
            <div className="h-10 w-px bg-white/10"></div>
            <div>
                <p className="text-[8px] font-black uppercase tracking-[0.8em] text-gray-500">Official Dispatch</p>
                <p className="text-[6px] font-bold uppercase tracking-[0.4em] text-red-600 mt-1">Infrastructure V4.1</p>
            </div>
        </div>
        <div className="text-right">
          <h1 className="text-5xl font-black tracking-tighter leading-[0.75] italic text-white uppercase">Top 10<br/><span className="text-red-600">Today.</span></h1>
          <p className="text-xs font-bold text-gray-700 uppercase tracking-[0.4em] mt-3">{date}</p>
        </div>
      </div>

      {/* List - Precise row height (138px) to prevent overflow */}
      <div className="flex-grow space-y-1.5 relative z-10">
        {topFilms.map((film, index) => (
          <div key={film.key} className="flex items-center gap-6 bg-white/[0.02] border border-white/5 p-2 rounded-[1.5rem] shadow-2xl overflow-hidden relative h-[138px]">
            {/* Massive Rank Number with Stroke */}
            <div className="absolute left-6 top-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
                <span className="text-[11rem] font-black italic tracking-tighter" style={{ WebkitTextStroke: '2px white', color: 'transparent' }}>{index + 1}</span>
            </div>
            
            <div className="flex items-center justify-center w-16 flex-shrink-0 relative z-10">
                <span className="text-4xl font-black text-red-600 italic">#{index + 1}</span>
            </div>
            
            <div className="relative w-16 h-24 flex-shrink-0 rounded-lg overflow-hidden shadow-2xl border border-white/10">
                <img 
                  src={film.poster ? `/api/proxy-image?url=${encodeURIComponent(film.poster)}` : ''} 
                  alt={film.title} 
                  className="w-full h-full object-cover" 
                  crossOrigin="anonymous" 
                />
            </div>
            
            <div className="flex-grow min-w-0 relative z-10 pr-6">
                <h2 className="text-3xl font-black uppercase tracking-tighter italic leading-[1] mb-1 line-clamp-2">{film.title}</h2>
                <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-[7px] font-black uppercase text-gray-500 tracking-[0.4em]">Streaming Now</span>
                </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Footer - Compact */}
      <div className="text-center mt-6 flex-shrink-0 relative z-10">
        <div className="inline-flex flex-col items-center gap-1.5">
            <div className="bg-red-600 text-white font-black px-8 py-2.5 rounded-xl shadow-2xl">
                <p className="text-xl font-black tracking-[0.4em]">WWW.CRATETV.NET</p>
            </div>
            <p className="text-[7px] font-black uppercase tracking-[1em] text-gray-700 mr-[-1em]">Digital Distribution Afterlife</p>
        </div>
      </div>
    </div>
  );
};

export default TopTenShareableImage;
