
import { Type } from '@google/genai';
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { likedTitles, allMovies } = await request.json();

    if (!Array.isArray(likedTitles) || likedTitles.length === 0 || !allMovies) {
      return new Response(JSON.stringify({ error: 'likedTitles (array) and allMovies (object) are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const availableMoviesCatalog = Object.entries(allMovies)
      .map(([key, movie]: [string, any]) => `"${key}": "${movie.title}"`)
      .join(',\n');

    const prompt = `
      You are a film recommendation expert for an indie streaming service called Crate TV.
      A user likes the following movies: ${JSON.stringify(likedTitles)}.
      Recommend up to 7 other movies from the available catalog below.
      Available movie catalog:
      {
        ${availableMoviesCatalog}
      }
      Respond with a JSON object: { "recommendedKeys": ["key1", "key2"] }.
    `;

    const response = await generateContentWithRetry({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    recommendedKeys: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                }
            }
        }
    });
    
    const responseJson = JSON.parse(response.text || '{}');
    const recommendedKeys = responseJson.recommendedKeys || [];

    return new Response(JSON.stringify({ recommendedKeys }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return new Response(JSON.stringify({ error: `Failed: ${error instanceof Error ? error.message : "Unknown"}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
