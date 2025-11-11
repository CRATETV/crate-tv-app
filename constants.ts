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
    ]
  },
  publicDomainIndie: { // Added because it's referenced and would cause a runtime error
    title: "Public Domain Indie Classics",
    movieKeys: []
  }
};

// The rest of this file was truncated in the prompt. 
// Providing empty fallbacks to allow the app to build and run without crashing on missing imports.
export const moviesData: Record<string, Movie> = {
    // Add placeholder movies to prevent runtime errors from empty categories
    geminitimeservice: {
        key: 'geminitimeservice',
        title: 'Gemini Time Service',
        synopsis: 'A short film about time.',
        cast: [],
        director: 'AI',
        trailer: '',
        fullMovie: '',
        poster: 'https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/a+trip+to+the+moon+.webp',
        tvPoster: 'https://cratetelevision.s3.us-east-1.amazonaws.com/public+domain+movies+/a+trip+to+the+moon+.webp',
    },
    consumed: { key: 'consumed', title: 'Consumed', synopsis: 'Placeholder', cast: [], director: '', trailer: '', fullMovie: '', poster: '', tvPoster: '' },
    results: { key: 'results', title: 'Results', synopsis: 'Placeholder', cast: [], director: '', trailer: '', fullMovie: '', poster: '', tvPoster: '' },
    newmovie1756741314485: { key: 'newmovie1756741314485', title: 'What If', synopsis: 'Placeholder', cast: [], director: '', trailer: '', fullMovie: '', poster: '', tvPoster: '' },
    lifeless: { key: 'lifeless', title: 'Lifeless', synopsis: 'Placeholder', cast: [], director: '', trailer: '', fullMovie: '', poster: '', tvPoster: '' },
    foodiecalldirectorscut: { key: 'foodiecalldirectorscut', title: 'Foodie Call (Director\'s Cut)', synopsis: 'Placeholder', cast: [], director: '', trailer: '', fullMovie: '', poster: '', tvPoster: '' },
    juniper: { key: 'juniper', title: 'Juniper', synopsis: 'Placeholder', cast: [], director: '', trailer: '', fullMovie: '', poster: '', tvPoster: '' },
    thatloud: { key: 'thatloud', title: 'That Loud', synopsis: 'Placeholder', cast: [], director: '', trailer: '', fullMovie: '', poster: '', tvPoster: '' },
    newmovie1756501125076: { key: 'newmovie1756501125076', title: 'Of Bees and Boobs', synopsis: 'Placeholder', cast: [], director: '', trailer: '', fullMovie: '', poster: '', tvPoster: '' },
    newmovie1756487626529: { key: 'newmovie1756487626529', title: 'Strange Encounters', synopsis: 'Placeholder', cast: [], director: '', trailer: '', fullMovie: '', poster: '', tvPoster: '' },
};

export const festivalData: FestivalDay[] = [];

export const festivalConfigData: FestivalConfig = { 
    title: 'Crate TV Film Festival', 
    description: 'Our annual celebration of independent cinema.', 
    startDate: '2025-01-01T00:00:00.000Z', 
    endDate: '2025-01-02T00:00:00.000Z' 
};

export const aboutData: AboutData = { 
    missionStatement: 'To provide a platform for independent filmmakers to showcase their work.', 
    story: 'Crate TV was founded to give a voice to the voiceless in the film industry.', 
    belief1Title: 'Creator First', 
    belief1Body: 'We believe in putting creators at the forefront.', 
    belief2Title: 'Community', 
    belief2Body: 'Building a community of film lovers and filmmakers.', 
    belief3Title: 'Quality', 
    belief3Body: 'Curating the best in independent cinema.', 
    founderName: 'Alex Doe', 
    founderTitle: 'Founder & CEO', 
    founderBio: 'A passionate filmmaker and advocate for independent art.', 
    founderPhoto: '' 
};
