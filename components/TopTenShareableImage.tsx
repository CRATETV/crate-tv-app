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
    // Gradient from the new design
    backgroundImage: 'radial-gradient(ellipse at center top, #1F1D47 0%, #121212 100%)'
  };

  return (
    <div style={containerStyle} className="text-white p-20 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-start mb-12 flex-shrink-0">
        <img 
          src={`/api/proxy-image?url=${encodeURIComponent("https://cratetelevision.s3.us-east-1.amazonaws.com/logo%20with%20background%20removed.png")}`} 
          alt="Crate TV Logo" 
          className="w-56" 
          crossOrigin="anonymous" 
        />
        <div className="text-right">
          <h1 className="text-7xl font-black tracking-tighter leading-none">TOP 10 TODAY</h1>
          <p className="text-3xl text-gray-400 mt-2">{date}</p>
        </div>
      </div>

      {/* List */}
      <div className="flex-grow space-y-5">
        {topFilms.map((film, index) => (
          <div key={film.key} className="flex items-center gap-6 bg-white/5 p-4 rounded-xl">
            <span 
              className="text-8xl font-black w-28 text-center"
              style={{ color: 'transparent', WebkitTextStroke: '2px #A78BFA' }}
            >
              {index + 1}
            </span>
            <img 
              src={film.poster ? `/api/proxy-image?url=${encodeURIComponent(film.poster)}` : ''} 
              alt={film.title} 
              className="w-24 h-36 object-cover rounded-md shadow-lg" 
              crossOrigin="anonymous" 
            />
            <span className="text-3xl font-bold flex-1">{film.title}</span>
          </div>
        ))}
      </div>
      
      {/* Footer */}
      <div className="text-center mt-12 flex-shrink-0">
        <p className="text-5xl font-bold tracking-widest text-gray-300">CRATETV.NET</p>
      </div>
    </div>
  );
};

export default TopTenShareableImage;