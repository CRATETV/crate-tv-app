import { getApiData } from './_lib/data.js';
import { Movie } from '../types.js';
import { getAiRecommendations } from './_lib/recommendations.js';

export const POST = async (req: Request) => {
  try {
    const body = await req.json();
    const { watchlist = [], likedMovies = [] } = body;
    const data = await getApiData();
    const allMovies: Movie[] = data.movies || [];

    if (allMovies.length === 0) {
      return new Response(JSON.stringify({ recommendations: [] }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const recommendations = await getAiRecommendations(allMovies, watchlist, likedMovies);

    return new Response(JSON.stringify({ recommendations }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("Recommendation Error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate recommendations", details: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
