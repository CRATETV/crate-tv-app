import React from 'react';
import { moviesData } from './constants.ts';
import { festivalData } from './constants.ts';
import { festivalConfigData } from './constants.ts';
import FestivalView from './components/FestivalView.tsx';

// This is a special, self-contained component created to demonstrate
// the visual appearance of the Film Festival module.
const FilmFestivalModule: React.FC = () => {
  return (
    <div className="bg-[#141414] text-white font-sans">
      <h2 className="text-center text-2xl font-bold p-4 bg-gray-800">
        Film Festival Module Preview
      </h2>
      <FestivalView
        festivalData={festivalData}
        festivalConfig={festivalConfigData}
        allMovies={moviesData}
      />
    </div>
  );
};

export default FilmFestivalModule;