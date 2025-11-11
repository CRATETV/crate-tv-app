import { Category, Movie, FestivalDay, FestivalConfig, AboutData } from './types';

// Utility function to robustly check if a movie is past its release time.
export const isMovieReleased = (movie: Movie | undefined | null): boolean => {
    if (!movie || !movie.releaseDateTime) {
        return true; // No release date means it's always available
    }
    // Compare the release time with the current time
    return new Date(movie.releaseDateTime) <= new Date();
};

export const categoriesData: Record<string, Category> = {
  nowPlaying: {
    title: 'Now Playing',
    movieKeys: ['geminitimeservice']
  },
  featured: {
    title: 'Featured Films',
    movieKeys: ['consumed', 'results', 'newmovie1756741314485', 'lifeless', 'foodiecalldirectorscut', 'juniper']
  },
  newReleases: {
    title: 'New Releases',
    movieKeys: [
        'geminitimeservice',
        'thatloud',
        'results',
        'newmovie1756741314485', // What If
        'newmovie1756501125076', // of Bees and Boobs
        'newmovie1756487626529', // Strange Encounters
        'newmovie1756487390550', // I Still Love Her
        'newmovie1756487215116', // Fling
        'newmovie1756486933392', // Power Trip
        'newmovie1756485973547', // Burst
    ]
  },
  awardWinners: {
    title: 'Award-Winning Films',
    movieKeys: ['lifeless', 'foodiecalldirectorscut', 'iloveyoublack', 'hair', 'juniper']
  },
  pwff12thAnnual: {
    title: 'PWFF-12th Annual Selections',
    movieKeys: [
      'newmovie1756487626529', // Strange Encounters
      'newmovie1756501125076', // of Bees and Boobs
      'newmovie1756487215116', // Fling
      'newmovie1756487390550', // I Still Love Her
      'newmovie1756485973547',  // Burst
      'newmovie1756486933392' // Power Trip
    ]
  },
  comedy: {
    title: 'Comedies',
    movieKeys: [
      'thatloud',
      'foodiecalldirectorscut',
      'foodiecalltheatricalcut',
      'eharmonycs',
      'youvsthem',
      'wrapitup',
      'newmovie1756485973547',
      'newmovie1756487390550',
      'newmovie1756501125076',
      'newmovie1756741314485',
      'twopeasinapod'
    ]
  },
  drama: {
    title: 'Dramas',
    movieKeys: [
      'geminitimeservice',
      'results',
      'lifeless',
      'almasvows',
      'finallycaught',
      'iloveyoublack',
      'hair',
      'autumn',
      'silentlove',
      'juniper',
      'drive',
      'crossroads',
      'fatherdaughterdance',
      'newmovie1756486933392',
      'newmovie1756487626529',
      'newmovie1756