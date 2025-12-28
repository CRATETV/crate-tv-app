
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { name, bio } = await request.json();

    if (!name || !bio) {
      return new Response(JSON.stringify({ error: 'Actor name and bio are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const prompt = `Generate a single, interesting, and little-known fun fact about the actor ${name}. Their provided biography is: "${bio}". The fact should be short, engaging, and suitable for a movie app. Do not start the fact with their name. For example, instead of saying "${name} once did...", say "Once did...". The fact should be a single, concise sentence.`;

    const response = await generateContentWithRetry({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
    });
    
    const fact = response.text || "Could not generate a fun fact at this time.";

    return new Response(JSON.stringify({ fact }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating fun fact:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    
    // Explicitly handle quota error for the UI
    const status = errorMessage.includes("429") ? 429 : 500;
    const cleanMessage = status === 429 
      ? "Crate TV is currently handling many requests. Please wait a moment and try again." 
      : `Failed to generate fun fact: ${errorMessage}`;

    return new Response(JSON.stringify({ error: cleanMessage }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
