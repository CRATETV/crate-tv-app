import { generateContentWithRetry } from './_lib/geminiRetry.js';
import { rateLimit, getIP } from './_lib/rateLimit.js';

export async function POST(request: Request) {
  try {
    // Unmetered AI calls (with Google Search grounding, which costs more
    // than a plain generation) on a public endpoint — anyone could script
    // repeated requests here and run up the bill for free.
    if (!rateLimit(`find-imdb:${getIP(request)}`, 20, 5 * 60_000)) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please wait a few minutes and try again.' }), { status: 429 });
    }

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