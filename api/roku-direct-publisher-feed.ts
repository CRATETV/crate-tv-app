// This is a Vercel Serverless Function
// It will be accessible at the path /api/roku-direct-publisher-feed

import { getApiData } from './_lib/data.js';
import { Movie, Category } from '../types.js';
import { getAdminDb } from './_lib/firebaseAdmin.js';
import { moviesData as fallbackMovies, categoriesData as fallbackCategories } from '../constants.js';

function toDate(val: any): Date | null {
    if (!val) return null;
    if (val.toDate && typeof val.toDate === 'function') return val.toDate();
    if (typeof val === 'object' && val._seconds) return new Date(val._seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
}

function isReleased(movie: Movie | undefined | null): boolean {
    if (!movie || !movie.releaseDateTime) return true;
    const date = toDate(movie.releaseDateTime);
    return !date || date <= new Date();
}

// Main function to generate the Direct Publisher feed
export async function GET(request: Request) {
  try {
    const apiData = await getApiData();
    const moviesData: Record<string, Movie> = { ...fallbackMovies, ...(apiData.movies || {}) };
    const categoriesData: Record<string, Category> = { ...fallbackCategories, ...(apiData.categories || {}) };

    const db = getAdminDb();
    if (db) {
        const [moviesSnap, categoriesSnap] = await Promise.all([
            db.collection('movies').get(),
            db.collection('categories').get()
        ]);

        if (!moviesSnap.empty) {
            moviesSnap.forEach(doc => {
                moviesData[doc.id] = { key: doc.id, ...doc.data() } as Movie;
            });
        }

        if (!categoriesSnap.empty) {
            categoriesSnap.forEach(doc => {
                categoriesData[doc.id] = { id: doc.id, ...doc.data() } as any as Category;
            });
        }
    }
    
    // Create a map to associate movie keys with their genres
    const movieGenreMap = new Map<string, string[]>();
    (Object.values(moviesData) as Movie[]).forEach((movie: Movie) => {
        if (movie && movie.key && isReleased(movie) && movie.fullMovie) {
            movieGenreMap.set(movie.key, []);
        }
    });
    
    (Object.values(categoriesData) as Category[]).forEach((category: Category) => {
        if (category && Array.isArray(category.movieKeys)) {
            category.movieKeys.forEach(movieKey => {
                if (movieGenreMap.has(movieKey)) {
                    movieGenreMap.get(movieKey)?.push(category.title);
                }
            });
        }
    });
    
    // Transform the application's movie data into the format Roku Direct Publisher requires
    const rokuMovies = (Object.values(moviesData) as Movie[])
      .filter((movie): movie is Movie => !!movie && isReleased(movie) && !!movie.fullMovie)
      .map((movie: Movie) => {
        const releaseDate = toDate(movie.releaseDateTime) || new Date();
        return {
          id: movie.key,
          title: movie.title,
          shortDescription: (movie.synopsis || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').substring(0, 200).trim() + '...',
          longDescription: (movie.synopsis || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim(),
          thumbnail: movie.poster || movie.tvPoster,
          releaseDate: releaseDate.toISOString(),
          genres: movieGenreMap.get(movie.key) || ['Independent'],
          tags: movieGenreMap.get(movie.key) || ['Independent'],
          credits: [
            { name: movie.director, role: 'director' },
            ...(movie.cast || []).map(actor => ({ name: actor.name, role: 'actor' }))
          ],
          content: {
            dateAdded: releaseDate.toISOString(),
            videos: [{
              url: movie.fullMovie,
              quality: 'HD',
              videoType: 'MP4'
            }],
            duration: movie.durationInMinutes ? movie.durationInMinutes * 60 : 0,
            language: "en-US"
          }
        };
      });

    // Construct the final feed object
    const feed = {
      providerName: 'Crate TV',
      lastUpdated: new Date().toISOString(),
      language: 'en-US',
      movies: rokuMovies
    };

    return new Response(JSON.stringify(feed, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error generating Roku Direct Publisher feed:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate feed.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}