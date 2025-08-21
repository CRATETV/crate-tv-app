import { GoogleGenAI } from '@google/genai';

// This is a Vercel Serverless Function
// It will be accessible at the path /api/find-imdb
export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    if (!name) {
      return new Response(JSON.stringify({ error: 'Actor name is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable is not set.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `Find the official IMDb page URL for the actor named "${name}". Respond with ONLY the URL and no other text or explanation.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          tools: [{googleSearch: {}}],
        },
    });
    
    const text = response.text;

    // Extract URL using a regex to be safe
    const imdbUrlRegex = /(https?:\/\/www\.imdb\.com\/name\/nm\d+\/?)/;
    const match = text ? text.match(imdbUrlRegex) : null;

    if (match && match[0]) {
        return new Response(JSON.stringify({ imdbUrl: match[0] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } else {
        // Could not find a valid URL
        return new Response(JSON.stringify({ imdbUrl: null }), {
            status: 200, // Not an error, just not found
            headers: { 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error finding IMDb URL:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: `Failed to find IMDb URL: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
