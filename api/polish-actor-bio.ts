
import { generateContentWithRetry } from './_lib/geminiRetry.js';
import { rateLimit, getIP } from './_lib/rateLimit.js';

export async function POST(request: Request) {
  try {
    // Unmetered AI calls on a public endpoint — anyone could script repeated
    // requests here and run up the Gemini bill for free.
    if (!rateLimit(`polish-actor-bio:${getIP(request)}`, 20, 5 * 60_000)) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please wait a few minutes and try again.' }), { status: 429 });
    }

    const { bio } = await request.json();
    if (!bio) return new Response(JSON.stringify({ error: 'Bio required' }), { status: 400 });

    const prompt = `
        You are a top-tier Hollywood talent agent. Rewrite the following actor bio to be prestigious, punchy, and highly professional. 
        Focus on their craft, technique, and artistic impact. 
        Remove any informal language. Keep it under 150 words.
        
        Original Bio: "${bio}"
        
        Respond with ONLY the rewritten text.
    `;

    const response = await generateContentWithRetry({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
    });
    
    return new Response(JSON.stringify({ polishedBio: response.text }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
