import { Type } from '@google/genai';
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { likedTitles, allMovies } = await request.json();

    if (!allMovies) return new Response(JSON.stringify({ error: 'Catalog required.' }), { status: 400 });

    const catalogKeys = Object.keys(allMovies);

    try {
        const catalogList = Object.entries(allMovies)
          .map(([key, movie]: [string, any]) => `"${key}": "${movie.title}"`)
          .join(',\n');

        const prompt = `Recommend 5 movie keys from this list for a user who likes ${JSON.stringify(likedTitles)}: ${catalogList}. Respond in JSON: { "recommendedKeys": [] }`;

        const response = await generateContentWithRetry({
            model: 'gemini-3-flash-preview',
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        recommendedKeys: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        });
        
        return new Response(response.text, { status: 200 });
    } catch (err: any) {
        // FAIL-SAFE: Return random movies from the catalog if AI is exhausted
        const shuffled = [...catalogKeys].sort(() => 0.5 - Math.random());
        const fallbackKeys = shuffled.slice(0, 5);
        
        return new Response(JSON.stringify({ 
            recommendedKeys: fallbackKeys,
            isFallback: true 
        }), { status: 200 });
    }
  } catch (error) {
    return new Response(JSON.stringify({ recommendedKeys: [] }), { status: 500 });
  }
}