import { GoogleGenAI } from '@google/genai';

// This is a Vercel Serverless Function
// Path: /api/find-play

export async function POST(request: Request) {
  try {
    const { cast, genre, password } = await request.json();

    // Simple password check to protect the endpoint
    if (password !== 'cratebio') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    if (!cast || !genre) {
      return new Response(JSON.stringify({ error: 'Cast and genre are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable is not set.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
        You are an expert dramaturg. An actor is looking for a play to practice a scene from. 
        Recommend a single, well-known or critically acclaimed play that fits the following criteria:

        1.  **Cast for the scene:** ${cast}
        2.  **Genre:** ${genre}

        Your response must be plain text and formatted exactly as follows, using "**" for bold labels:
        -   **Play Title:** [Title of the Play]
        -   **Author:** [Author's Name]
        -   **Synopsis:** A brief, one-paragraph summary of the play.
        -   **Scene Suggestion:** A short description of a specific scene from the play that fits the casting criteria, including the characters involved.

        Do not include any introductory or concluding text like "Here is a recommendation:".
    `;

    // FIX: Updated model to gemini-3-flash-preview for basic text tasks as per GenAI guidelines.
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
    });
    
    const recommendation = response.text || "Could not find a play at this time. Please try different criteria.";

    return new Response(JSON.stringify({ recommendation }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error finding play:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: `Failed to find play: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
