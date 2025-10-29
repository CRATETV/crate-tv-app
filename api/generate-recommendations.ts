// This is a Vercel Serverless Function
// It will be accessible at the path /api/generate-recommendations
import { GoogleGenAI, Type } from '@google/genai';

export async function POST(request: Request) {
  try {
    const { movieTitle, movieSynopsis } = await request.json();

    if (!movieTitle || !movieSynopsis) {
      return new Response(JSON.stringify({ error: 'Movie title and synopsis are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable is not set.");
    }

    // FIX: Replaced placeholder content with a full implementation for generating movie recommendations using the Gemini API.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `Based on the movie "${movieTitle}" with the synopsis: "${movieSynopsis}", recommend 5 similar movies. Provide only the movie titles.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    recommendations: {
                        type: Type.ARRAY,
                        description: "A list of 5 recommended movie titles.",
                        items: {
                            type: Type.STRING,
                            description: "The title of a recommended movie."
                        }
                    }
                },
                required: ["recommendations"]
            }
        }
    });
    
    const text = response.text;
    if (!text) {
        throw new Error("The model did not return any recommendations.");
    }
    
    const recommendations = JSON.parse(text);

    return new Response(JSON.stringify(recommendations), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: `Failed to generate recommendations: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
