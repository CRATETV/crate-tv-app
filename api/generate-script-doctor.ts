import { GoogleGenAI, Type } from '@google/genai';

export async function POST(request: Request) {
  try {
    const { scriptText, title, password } = await request.json();

    if (password !== 'cratebio') return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    if (!process.env.API_KEY) throw new Error("API_KEY not set");

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      You are a professional Script Doctor and Industry Consultant for Crate TV.
      Analyze the following script/treatment for the project titled "${title}":
      
      "${scriptText}"

      Provide a deep-dive analysis in JSON format:
      1. Narrative Pulse: (Score 1-10 on pacing, character, and stakes).
      2. Constructive Critique: (3 specific ways to improve the dramatic tension).
      3. Market Fit: (Which global regions and demographics will this resonate with most?).
      4. Comparable Titles: (3 successful indie or major films with similar vibes).
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    scores: {
                        type: Type.OBJECT,
                        properties: {
                            pacing: { type: Type.NUMBER },
                            character: { type: Type.NUMBER },
                            stakes: { type: Type.NUMBER }
                        }
                    },
                    critique: { type: Type.ARRAY, items: { type: Type.STRING } },
                    marketFit: { type: Type.STRING },
                    comparables: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["scores", "critique", "marketFit", "comparables"]
            }
        }
    });
    
    return new Response(response.text, { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}