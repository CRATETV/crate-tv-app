// This is a Vercel Serverless Function for Roku Direct Publisher.
// Path: /api/roku-direct-publisher-feed

import { getApiData } from './_lib/data.js';
import { Movie, Category } from '../types.js';

// Helper to convert minutes to ISO 8601 duration format (e.g., "PT10M30S")
const toISO8601Duration = (minutes: number): string => {
    if (isNaN(minutes) || minutes <= 0) {
        return "PT0M";
    }
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    return `PT${mins}M${secs}S`;
};

// Main function to handle the GET request
export async function GET(request: Request) {
  try {
    const { movies: moviesData, categories: categoriesData } = await getApiData();

    const now = new Date();
    const movieGenreMap = new Map<string, string[]>();

    (Object.values(categoriesData) as Category[]).forEach((category: Category) => {
        if (category && Array.isArray(category.movieKeys)) {
            category.movieKeys.forEach(movieKey => {
                if (!movieGenreMap.has(movieKey)) movieGenreMap.set(movieKey, []);
                movieGenreMap.get(movieKey)?.push(category.title);
            });
        }
    });

    const shortFormVideos = Object.values(moviesData)
      // FIX: Add type `any` to the `movie` parameter to resolve TypeScript error about accessing properties on type `unknown`.
      // The original filter logic was also buggy and would pass null/undefined values, which has been corrected.
      .filter((movie: any): movie is Movie => {
          if (!movie) {
            return false;
          }
          if (!movie.releaseDateTime) {
            return true;
          }
          return new Date(movie.releaseDateTime) <= now;
      })
      .map(movie => {
        const genres = movieGenreMap.get(movie.key) || [];
        const tags = [movie.director, ...(movie.cast || []).map(c => c.name)].filter(Boolean);

        return {
          id: movie.key,
          title: movie.title,
          shortDescription: (movie.synopsis || '').replace(/<br\s*\/?>/gi, ' ').substring(0, 200).trim(),
          longDescription: (movie.synopsis || '').replace(/<br\s*\/?>/gi, '\n').trim(),
          thumbnail: movie.tvPoster || movie.poster,
          genres: genres,
          tags: tags,
          releaseDate: movie.releaseDateTime ? new Date(movie.releaseDateTime).toISOString() : new Date().toISOString(),
          content: {
            dateAdded: movie.releaseDateTime ? new Date(movie.releaseDateTime).toISOString() : new Date().toISOString(),
            videos: [
              {
                url: movie.fullMovie,
                quality: "HD",
                videoType: "MP4",
              },
            ],
            duration: toISO8601Duration(movie.durationInMinutes || 0),
            language: "en-US",
          },
        };
      });

    const feed = {
      providerName: "Crate TV",
      lastUpdated: now.toISOString(),
      language: "en-US",
      shortFormVideos: shortFormVideos,
    };

    return new Response(JSON.stringify(feed, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200', // Cache for 1 day
      },
    });
  } catch (error) {
    console.error('Error generating Roku Direct Publisher feed:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return new Response(JSON.stringify({ error: `Failed to generate feed: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}