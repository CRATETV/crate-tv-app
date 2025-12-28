
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { genre, emotion, password } = await request.json();

    if (password !== 'cratebio') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    if (!genre || !emotion) {
      return new Response(JSON.stringify({ error: 'Genre and emotion are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const prompt = `You are a playwright. Generate a short, original, one-minute monologue for: Genre: ${genre}, Emotion: ${emotion}. Format as: CHARACTER: [Name], CONTEXT: [One sentence], and the text.`;

    const response = await generateContentWithRetry({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
    });
    
    const monologue = response.text || "Could not generate a monologue at this time. Please try again.";

    return new Response(JSON.stringify({ monologue }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating monologue:', error);
    return new Response(JSON.stringify({ error: `Failed: ${error instanceof Error ? error.message : "Unknown"}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
