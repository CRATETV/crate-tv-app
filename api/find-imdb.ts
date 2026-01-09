import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    if (!name) return new Response(JSON.stringify({ error: 'Name required.' }), { status: 400 });

    const prompt = `Find the official IMDb page URL for the actor "${name}". Response: URL only.`;

    try {
        const response = await generateContentWithRetry({
            model: 'gemini-3-flash-preview',
            contents: [{ parts: [{ text: prompt }] }],
            config: {
              tools: [{ googleSearch: {} }],
            },
        });
        
        const imdbUrlRegex = /(https?:\/\/www\.imdb\.com\/name\/nm\d+\/?)/;
        const match = response.text?.match(imdbUrlRegex);

        return new Response(JSON.stringify({ imdbUrl: match ? match[0] : null }), { status: 200 });
    } catch (e: any) {
        // For IMDb, if AI is exhausted, just return null so the UI doesn't show a broken link
        return new Response(JSON.stringify({ imdbUrl: null, error: "Search deferred." }), { status: 200 });
    }
  } catch (error) {
    return new Response(JSON.stringify({ imdbUrl: null }), { status: 200 });
  }
}