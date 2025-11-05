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
    height: '1080px',
    fontFamily: "'Inter', sans-serif",
  };

  return (
    <div style={containerStyle} className="bg-gradient-to-br from-[#111827] via-[#3730A3] to-black text-white p-20 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-10 flex-shrink-0">
        <img 
          src={`/api/proxy-image?url=${encodeURIComponent("https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png")}`} 
          alt="Crate TV Logo" 
          className="w-48" 
          crossOrigin="anonymous" 
        />
        <div className="text-right">
          <h1 className="text-6xl font-black tracking-tighter">TOP 10 TODAY</h1>
          <p className="text-3xl text-gray-300 mt-1">{date}</p>
        </div>
      </div>

      {/* List */}
      <div className="flex-grow grid grid-cols-2 gap-x-16 gap-y-6">
        {topFilms.map((film, index) => (
          <div key={film.key} className="flex items-center gap-5">
            <span className="text-8xl font-black text-purple-400 w-24 text-right">{index + 1}</span>
            <img 
              src={film.poster ? `/api/proxy-image?url=${encodeURIComponent(film.poster)}` : ''} 
              alt={film.title} 
              className="w-24 h-36 object-cover rounded-md shadow-lg" 
              crossOrigin="anonymous" 
            />
            <span className="text-2xl font-bold flex-1">{film.title}</span>
          </div>
        ))}
      </div>
      
      {/* Footer */}
      <div className="text-center mt-10 flex-shrink-0">
        <p className="text-4xl font-bold tracking-widest text-gray-300">CRATETV.NET</p>
      </div>
    </div>
  );
};

export default TopTenShareableImage;
