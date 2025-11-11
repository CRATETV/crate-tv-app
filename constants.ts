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
        'newmovie175648