import { GoogleGenAI } from '@google/genai';

// This is a Vercel Serverless Function
// It will be accessible at the path /api/generate-fact
export async function POST(request: Request) {
  try {
    const { name, bio } = await request.json();

    if (!name || !bio) {
      return new Response(JSON.stringify({ error: 'Actor name and bio are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable is not set.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `Generate a single, interesting, and little-known fun fact about the actor ${name}. Their provided biography is: "${bio}". The fact should be short, engaging, and suitable for a movie app. Do not start the fact with their name. For example, instead of saying "${name} once did...", say "Once did...". The fact should be a single, concise sentence.`;

    // FIX: Updated model to gemini-3-flash-preview for basic text tasks as per GenAI guidelines.
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
    });
    
    const fact = response.text || "Could not generate a fun fact at this time.";

    return new Response(JSON.stringify({ fact }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating fun fact:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: `Failed to generate fun fact: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
