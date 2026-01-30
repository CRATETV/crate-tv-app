
import { Type } from '@google/genai';
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const prompt = `
        You are a Strategic Acquisitions Head for Crate TV. 
        Your mission is to find EXACTLY 5 high-potential independent short films that won awards or received high praise at major festivals in 2024 or 2025 (e.g. Sundance, SXSW, Berlinale, Tribeca, or regional Philly fests).
        
        Focus on films that:
        1. Fit the Crate TV aesthetic (Industrial, authentic, visually arresting).
        2. Are currently in the "Afterlife" phase (finished their festival run and looking for a permanent home).
        3. Would benefit from Crate's 70/30 patronage model.

        For each film, provide:
        - title: Exact film title
        - director: Filmmaker name
        - award: The specific award won (e.g. "Sundance Jury Prize: Narrative")
        - marketValue: A score of how much traffic they would bring (e.g. "9.8/10: Viral Potential")
        - pitchHook: A one-sentence 'Why Crate?' hook for that specific film.
        - status: 'Secure Now' or 'High Potential'

        Respond with ONLY a JSON object: { "targets": [ { ... }, ... ] }
    `;

    const response = await generateContentWithRetry({
        model: 'gemini-3-pro-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    targets: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                director: { type: Type.STRING },
                                award: { type: Type.STRING },
                                marketValue: { type: Type.STRING },
                                pitchHook: { type: Type.STRING },
                                status: { type: Type.STRING, enum: ["High Potential", "Secure Now"] }
                            },
                            required: ["title", "director", "award", "marketValue", "pitchHook", "status"]
                        }
                    }
                },
                required: ["targets"]
            }
        }
    });
    
    return new Response(response.text, { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    console.error("Strategic Scout Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
