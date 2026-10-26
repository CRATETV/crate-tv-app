// This is a Vercel Serverless Function
// It will be accessible at the path /api/roku-movie-details

import { getApiData } from './_lib/data.js';
import { isPastAvailableUntil } from './_lib/filmAvailability.js';
import { paidFestivalFilmKeys, isFreeForEveryone } from './_lib/paidRules.js';
import { Movie, Category } from '../types.js';
import { getAdminDb } from './_lib/firebaseAdmin.js';
import { signStreamUrl } from './_lib/signStreamUrl.js';
import { resolveMovieAccess } from './_lib/entitlements.js';

function toDate(val: any): Date | null {
    if (!val) return null;
    if (val.toDate && typeof val.toDate === 'function') return val.toDate();
    if (typeof val === 'object' && val._seconds) return new Date(val._seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
}

// Helper function to format a single movie for Roku
const formatMovieForRoku = async (movie: Movie, categoriesData: Record<string, Category>, isUnlocked: boolean = false, isFree: boolean = false) => {
    const genres = Object.values(categoriesData)
        .filter(cat => cat && Array.isArray(cat.movieKeys) && cat.movieKeys.includes(movie.key))
        .map(cat => cat.title);

    let description = (movie.synopsis || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();

    if (!isUnlocked && !isFree) {
        const price = movie.salePrice || movie.watchPartyPrice || 0;
        const priceStr = price > 0 ? ` [$${price.toFixed(2)}]` : '';
        description = `Visit cratetv.net to unlock this title${priceStr}. ${description}`;
    }

    // SECURITY: once unlocked, this used to hand back movie.fullMovie as-is — a permanent
    // URL, same issue as roku-feed.ts (see the comment there). Signs it instead; falls back
    // to the raw URL if signing fails, since entitlement (isUnlocked) is the real gate here,
    // not the signature — availability over the marginal expiry improvement.
    let streamUrl = movie.trailer || '';
    // Past its "Hide automatically after" time: off CRATE for everyone.
    if (isPastAvailableUntil(movie, Date.now())) isUnlocked = false;
    if (isUnlocked && movie.fullMovie) {
        const signed = await signStreamUrl(movie.fullMovie);
        streamUrl = signed ? signed.url : movie.fullMovie;
    }

    // Ensure all fields are strings to prevent crashes on 'invalid' data in BrightScript
    return {
        id: movie.key || '',
        title: movie.title || 'Untitled Film',
        description: description,
        SDPosterUrl: movie.poster || movie.tvPoster || '',
        HDPosterUrl: movie.poster || movie.tvPoster || '',
        streamUrl,
        director: movie.director || '',
        actors: movie.cast ? movie.cast.map(c => c.name || '') : [],
        genres: genres,
        isUnlocked: isUnlocked,
        isFree: isFree
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

    const { movies: moviesData, categories: categoriesData, festivalData } = await getApiData();
    // Festival films are priced by their block (Oct 23 2026).
    const isFree = isFreeForEveryone(moviesData[movieId], paidFestivalFilmKeys(festivalData));
    const movie = moviesData[movieId];

    if (!movie) {
      return new Response(JSON.stringify({ error: 'Movie not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let isUnlocked = isFree;

    // Access uses the website's own rules (api/_lib/entitlements.ts). This used
    // to treat any festival pass as unlocking every paid film. (Oct 2026)
    if (!isUnlocked && deviceId) {
        const db = getAdminDb();
        if (db) {
            const access = await resolveMovieAccess(db, { deviceId, movieKey: movieId, mode: 'ondemand' });
            isUnlocked = access.granted;
        }
    }

    const rokuMovie = await formatMovieForRoku(movie, categoriesData, isUnlocked, isFree);

    return new Response(JSON.stringify(rokuMovie, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Answers depend on who is asking (deviceId), so never cache them.
        'Cache-Control': deviceId ? 'private, no-store' : 's-maxage=3600, stale-while-revalidate',
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