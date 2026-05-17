// This is a Vercel Serverless Function
// It will be accessible at the path /api/roku-movie-details

import { getApiData } from './_lib/data.js';
import { Movie, Category } from '../types.js';
import { getAdminDb } from './_lib/firebaseAdmin.js';

function toDate(val: any): Date | null {
    if (!val) return null;
    if (val.toDate && typeof val.toDate === 'function') return val.toDate();
    if (typeof val === 'object' && val._seconds) return new Date(val._seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
}

// Helper function to format a single movie for Roku
const formatMovieForRoku = (movie: Movie, categoriesData: Record<string, Category>, isUnlocked: boolean = false) => {
    const genres = Object.values(categoriesData)
        .filter(cat => cat && Array.isArray(cat.movieKeys) && cat.movieKeys.includes(movie.key))
        .map(cat => cat.title);

    let description = (movie.synopsis || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
    
    if (!isUnlocked && (movie.isForSale || movie.isWatchPartyPaid)) {
        const price = movie.salePrice || movie.watchPartyPrice || 0;
        const priceStr = price > 0 ? ` [$${price.toFixed(2)}]` : '';
        description = `Visit cratetv.net to unlock this title${priceStr}. ${description}`;
    }

    // Ensure all fields are strings to prevent crashes on 'invalid' data in BrightScript
    return {
        id: movie.key || '',
        title: movie.title || 'Untitled Film',
        description: description,
        SDPosterUrl: movie.poster || movie.tvPoster || '',
        HDPosterUrl: movie.poster || movie.tvPoster || '',
        streamUrl: isUnlocked ? (movie.fullMovie || '') : (movie.trailer || ''),
        director: movie.director || '',
        actors: movie.cast ? movie.cast.map(c => c.name || '') : [],
        genres: genres,
        isUnlocked: isUnlocked,
        isFree: !movie.isForSale && !movie.isWatchPartyPaid
    };
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const movieId = url.searchParams.get('id');
    const deviceId = url.searchParams.get('deviceId');

    if (!movieId) {
      return new Response(JSON.stringify({ error: 'Movie ID is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { movies: moviesData, categories: categoriesData } = await getApiData();
    const movie = moviesData[movieId];

    if (!movie) {
      return new Response(JSON.stringify({ error: 'Movie not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let isUnlocked = !movie.isForSale && !movie.isWatchPartyPaid;

    if (!isUnlocked && deviceId) {
        const db = getAdminDb();
        if (db) {
            const linkDoc = await db.collection('roku_links').doc(deviceId).get();
            if (linkDoc.exists) {
                const userId = linkDoc.data()?.userId;
                const userDoc = await db.collection('users').doc(userId).get();
                const userData = userDoc.data();
                
                if (userData) {
                    // Check rentals
                    if (userData.rentals && userData.rentals[movieId]) {
                        const exp = toDate(userData.rentals[movieId]);
                        if (exp && exp > new Date()) isUnlocked = true;
                    }
                    
                    // Check passes
                    if (!isUnlocked) {
                        if (userData.hasJuryPass || userData.hasFestivalAllAccess || userData.hasCrateFestPass) {
                            isUnlocked = true;
                        } else if (userData.festivalPassExpiry) {
                            const exp = toDate(userData.festivalPassExpiry);
                            if (exp && exp > new Date()) isUnlocked = true;
                        } else if (userData.crateFestPassExpiry) {
                            const exp = toDate(userData.crateFestPassExpiry);
                            if (exp && exp > new Date()) isUnlocked = true;
                        }
                    }
                }
            }
        }
    }
    
    const rokuMovie = formatMovieForRoku(movie, categoriesData, isUnlocked);

    return new Response(JSON.stringify(rokuMovie, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating Roku movie details:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate movie details.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}