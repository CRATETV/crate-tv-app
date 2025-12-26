import { GoogleGenAI } from '@google/genai';

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

    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable is not set.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
        You are a world-class playwright and screenwriter. Your task is to generate a short, original, one-minute monologue for an actor to practice.

        Instructions:
        1.  **Genre:** ${genre}
        2.  **Character's Core Emotion:** ${emotion}
        3.  **Format:** The response must be plain text and formatted exactly as follows:
            -   A character name (e.g., "CHARACTER: Alex").
            -   A brief, one-sentence context for the scene (e.g., "CONTEXT: Alex is speaking to their estranged father for the first time in ten years.").
            -   The monologue text itself.
    `;

    const response = await ai.models.generateContent({
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
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: `Failed to generate monologue: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}