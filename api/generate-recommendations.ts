import { GoogleGenAI, Type } from '@google/genai';
import { Movie } from '../types.ts';

// This is a Vercel Serverless Function
// It will be accessible at the path /api/generate-recommendations
export async function POST(request: Request) {
  try {
    const { likedTitles, allMovies } = await request.json();

    if (!Array.isArray(likedTitles) || likedTitles.length === 0 || !allMovies) {
      return new Response(JSON.stringify({ error: 'likedTitles (array) and allMovies (object) are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable is not set.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Create a string representation of the available movies catalog
    const availableMoviesCatalog = Object.entries(allMovies)
      .map(([key, movie]: [string, any]) => `"${key}": "${movie.title}"`)
      .join(',\n');

    const prompt = `
      You are a film recommendation expert for an indie streaming service called Crate TV.
      A user likes the following movies: ${JSON.stringify(likedTitles)}.

      Based on these preferences, recommend up to 7 other movies from the available catalog below.
      Prioritize movies that share similar genres, themes, directors, or actors.
      Do not recommend movies that are already in the user's liked list.

      Available movie catalog (as a JSON object of "key": "title"):
      {
        ${availableMoviesCatalog}
      }

      Respond with a JSON object that matches this schema: { "recommendedKeys": ["key1", "key2"] }.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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
    
    // Since we expect a JSON response, parse the text
    const responseJson = JSON.parse(response.text || '{}');
    const recommendedKeys = responseJson.recommendedKeys || [];

    return new Response(JSON.stringify({ recommendedKeys }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: `Failed to generate recommendations: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
