import React from 'react';
import { moviesData } from './constants';
import { festivalData } from './constants';
import { festivalConfigData } from './constants';
import FestivalView from './components/FestivalView';

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
        // FIX: Provide dummy props for access control to satisfy the component's interface for this preview module.
        unlockedBlockIds={new Set()}
        hasAllAccessPass={false}
        onUnlockBlock={() => {}}
        onGrantAllAccess={() => {}}
      />
    </div>
  );
};

export default FilmFestivalModule;
