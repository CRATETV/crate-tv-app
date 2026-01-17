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
    <div style={containerStyle} className="text-white p-14 flex flex-col">
      {/* Cinematic Background Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.12)_0%,transparent_60%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.08)_0%,transparent_60%)]"></div>
      
      {/* Film Grain / Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.15] pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')]"></div>
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
      
      {/* Deep Vignette */}
      <div className="absolute inset-0 shadow-[inset_0_0_300px_rgba(0,0,0,0.9)] pointer-events-none"></div>
      
      {/* Header */}
      <div className="flex justify-between items-start mb-14 relative z-10">
        <div className="flex items-center gap-6">
            <img 
              src={`/api/proxy-image?url=${encodeURIComponent("https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png")}`} 
              alt="Crate TV Logo" 
              className="w-40 invert brightness-0 opacity-80" 
              crossOrigin="anonymous" 
            />
            <div className="h-10 w-px bg-white/10"></div>
            <div>
                <p className="text-[9px] font-black uppercase tracking-[0.8em] text-gray-500">Official Dispatch</p>
                <p className="text-[7px] font-bold uppercase tracking-[0.4em] text-red-600 mt-1">Global Infrastructure</p>
            </div>
        </div>
        <div className="text-right">
          <h1 className="text-8xl font-black tracking-tighter leading-[0.8] italic text-white uppercase">Top 10<br/><span className="text-red-600">Today.</span></h1>
          <p className="text-xl font-bold text-gray-700 uppercase tracking-[0.4em] mt-4">{date}</p>
        </div>
      </div>

      {/* List - Adjusted for 10 items */}
      <div className="flex-grow space-y-4 relative z-10">
        {topFilms.map((film, index) => (
          <div key={film.key} className="flex items-center gap-8 bg-white/[0.02] border border-white/5 p-4 rounded-[2rem] shadow-2xl overflow-hidden relative group h-[142px]">
            {/* Massive Rank Number with Stroke */}
            <div className="absolute left-6 top-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
                <span className="text-[14rem] font-black italic tracking-tighter" style={{ WebkitTextStroke: '2px white', color: 'transparent' }}>{index + 1}</span>
            </div>
            
            <div className="flex items-center justify-center w-24 flex-shrink-0 relative z-10">
                <span className="text-5xl font-black text-red-600 italic">#{index + 1}</span>
            </div>
            
            <div className="relative w-20 h-28 flex-shrink-0 rounded-xl overflow-hidden shadow-[0_15px_30px_rgba(0,0,0,0.8)] border border-white/10">
                <img 
                  src={film.poster ? `/api/proxy-image?url=${encodeURIComponent(film.poster)}` : ''} 
                  alt={film.title} 
                  className="w-full h-full object-cover" 
                  crossOrigin="anonymous" 
                />
            </div>
            
            <div className="flex-grow min-w-0 relative z-10 flex flex-col justify-center">
                <h2 className="text-[38px] font-black uppercase tracking-tighter italic truncate leading-[1.2] mb-1 py-1">{film.title}</h2>
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-[0.4em]">Streaming Now</span>
                </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Footer */}
      <div className="text-center mt-10 flex-shrink-0 relative z-10">
        <div className="inline-flex flex-col items-center gap-3">
            <div className="bg-red-600 text-white font-black px-10 py-4 rounded-2xl shadow-2xl">
                <p className="text-3xl font-black tracking-[0.4em]">WWW.CRATETV.NET</p>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.8em] text-gray-700 mr-[-0.8em]">Digital Distribution Afterlife</p>
        </div>
      </div>
    </div>
  );
};

export default TopTenShareableImage;