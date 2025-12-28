
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    if (!name) {
      return new Response(JSON.stringify({ error: 'Actor name is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const prompt = `Find the official IMDb page URL for the actor named "${name}". Respond with ONLY the URL and no other text or explanation.`;

    const response = await generateContentWithRetry({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          tools: [{googleSearch: {}}],
        },
    });
    
    const text = response.text;
    const imdbUrlRegex = /(https?:\/\/www\.imdb\.com\/name\/nm\d+\/?)/;
    const match = text ? text.match(imdbUrlRegex) : null;

    return new Response(JSON.stringify({ imdbUrl: match ? match[0] : null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error finding IMDb URL:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: `Failed to find IMDb URL: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
