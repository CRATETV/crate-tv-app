
import { Type } from '@google/genai';
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { scriptText, title, password } = await request.json();

    if (password !== 'cratebio') return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const prompt = `Script Doctor analysis for "${title}": "${scriptText}". Provide scores, critique, market fit, and comparable titles in JSON.`;

    const response = await generateContentWithRetry({
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
