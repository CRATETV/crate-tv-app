
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
    position: 'relative'
  };

  return (
    <div style={containerStyle} className="text-white p-16 flex flex-col">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.08)_0%,transparent_70%)]"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
      
      {/* Header */}
      <div className="flex justify-between items-start mb-20 relative z-10">
        <div className="flex items-center gap-6">
            <img 
              src={`/api/proxy-image?url=${encodeURIComponent("https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png")}`} 
              alt="Crate TV Logo" 
              className="w-48 invert" 
              crossOrigin="anonymous" 
            />
            <div className="h-10 w-px bg-white/20"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.6em] text-gray-500">Official Infrastructure</p>
        </div>
        <div className="text-right">
          <h1 className="text-8xl font-black tracking-tighter leading-[0.8] italic text-white">TOP 10<br/><span className="text-red-600">TODAY.</span></h1>
          <p className="text-2xl font-bold text-gray-700 uppercase tracking-[0.3em] mt-4">{date}</p>
        </div>
      </div>

      {/* List */}
      <div className="flex-grow space-y-4 relative z-10">
        {topFilms.map((film, index) => (
          <div key={film.key} className="flex items-center gap-10 bg-white/[0.03] border border-white/5 p-4 rounded-[2rem] shadow-2xl overflow-hidden relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-[0.05] pointer-events-none">
                <span className="text-[12rem] font-black italic tracking-tighter" style={{ WebkitTextStroke: '2px white', color: 'transparent' }}>{index + 1}</span>
            </div>
            
            <div className="flex items-center justify-center w-24 flex-shrink-0">
                <span className="text-5xl font-black text-red-600 italic">#{index + 1}</span>
            </div>
            
            <div className="relative w-24 h-36 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                <img 
                  src={film.poster ? `/api/proxy-image?url=${encodeURIComponent(film.poster)}` : ''} 
                  alt={film.title} 
                  className="w-full h-full object-cover" 
                  crossOrigin="anonymous" 
                />
            </div>
            
            <div className="flex-grow min-w-0">
                <h2 className="text-4xl font-black uppercase tracking-tighter italic truncate leading-none mb-2">{film.title}</h2>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Streaming Manifest Active</span>
                </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Footer */}
      <div className="text-center mt-12 flex-shrink-0 relative z-10">
        <div className="bg-red-600/10 border border-red-600/20 px-8 py-4 rounded-3xl inline-block mb-6">
            <p className="text-3xl font-black tracking-[0.4em] text-red-500">WWW.CRATETV.NET</p>
        </div>
        <p className="text-[11px] font-black uppercase tracking-[0.8em] text-gray-700">Digital Distribution Afterlife // Powered by Crate TV</p>
      </div>
    </div>
  );
};

export default TopTenShareableImage;
