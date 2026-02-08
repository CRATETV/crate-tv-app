import { getApiData } from './_lib/data.js';
import { Movie, Category } from '../types.js';
import { getAdminDb } from './_lib/firebaseAdmin.js';

const isMovieVisible = (movie: Movie | undefined | null): boolean => {
    if (!movie || movie.isUnlisted) return false;
    const now = new Date();
    const isReleased = !movie.releaseDateTime || new Date(movie.releaseDateTime) <= now;
    return isReleased && !!movie.fullMovie && !!movie.poster;
};

export async function GET(request: Request) {
  try {
    const apiData = await getApiData();
    const moviesData = apiData.movies || {};
    const categoriesData = apiData.categories || {};
    
    const db = getAdminDb();
    const viewCounts: Record<string, number> = {};

    if (db) {
        const viewsSnap = await db.collection('view_counts').get();
        viewsSnap.forEach(doc => {
            viewCounts[doc.id] = Number(doc.data().count || 0);
        });
    }

    const movieGenreMap = new Map<string, string[]>();
    const visibleMovies: Record<string, Movie> = {};

    Object.values(moviesData).forEach((movie: any) => {
        const m = movie as Movie;
        if (m && m.key && isMovieVisible(m)) {
            visibleMovies[m.key] = m;
            movieGenreMap.set(m.key, []);
        }
    });
    
    Object.values(categoriesData).forEach((category: any) => {
        const cat = category as Category;
        if (cat && Array.isArray(cat.movieKeys)) {
            cat.movieKeys.forEach(movieKey => {
                if (movieGenreMap.has(movieKey)) {
                    movieGenreMap.get(movieKey)?.push(cat.title);
                }
            });
        }
    });
    
    const rokuCategories = Object.values(categoriesData)
      .map((category: any) => {
          const cat = category as Category;
          if (!cat || !cat.movieKeys || cat.movieKeys.length === 0) return null;

          const items = cat.movieKeys
            .map(key => visibleMovies[key])
            .filter((m): m is Movie => !!m)
            // SORT BY LIVE VIEW COUNTS
            .sort((a, b) => (viewCounts[b.key] || 0) - (viewCounts[a.key] || 0))
            .map((movie: Movie) => {
                return {
                    title: movie.title,
                    description: (movie.synopsis || '').replace(/<[^>]+>/gi, ' ').trim(),
                    streamUrl: movie.rokuStreamUrl || movie.fullMovie,
                    HDPosterUrl: movie.poster,
                    genres: movieGenreMap.get(movie.key) || ['Independent'],
                    director: movie.director,
                    actors: movie.cast.map(c => c.name),
                };
            });
        
        if (items.length === 0) return null;
        
        return {
            title: cat.title,
            children: items,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);


    return new Response(JSON.stringify(rokuCategories, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating Instant TV Channel feed:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate feed.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}