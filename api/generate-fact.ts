import { generateContentWithRetry } from './_lib/geminiRetry.js';
import { rateLimit, getIP } from './_lib/rateLimit.js';

export async function POST(request: Request) {
  try {
    // Unmetered AI calls on a public endpoint — anyone could script repeated
    // requests here and run up the Gemini bill for free.
    if (!rateLimit(`generate-fact:${getIP(request)}`, 20, 5 * 60_000)) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please wait a few minutes and try again.' }), { status: 429 });
    }

    const { name, bio } = await request.json();

    if (!name || !bio) {
      return new Response(JSON.stringify({ error: 'Context required.' }), { status: 400 });
    }

    const prompt = `Generate a short, engaging one-sentence fun fact about the actor ${name} based on this bio: "${bio}". Focus on their technique or a highlight. No intro.`;

    try {
        const response = await generateContentWithRetry({
            model: 'gemini-3-flash-preview',
            contents: [{ parts: [{ text: prompt }] }],
            config: { temperature: 0.7 }
        });
        
        return new Response(JSON.stringify({ fact: response.text }), { status: 200 });
    } catch (err: any) {
        // FALLBACK: If AI is exhausted, return a high-quality generic insight
        if (err.isQuotaError) {
            return new Response(JSON.stringify({ 
                fact: "Consistently recognized by peers for bringing a unique and disciplined aesthetic to independent cinema.",
                isFallback: true 
            }), { status: 200 });
        }
        throw err;
    }
  } catch (error) {
    return new Response(JSON.stringify({ fact: "A dedicated practitioner of the craft with a focus on narrative depth." }), { status: 200 });
  }
}