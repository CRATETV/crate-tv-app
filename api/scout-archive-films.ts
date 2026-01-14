
import { GoogleGenAI, Type } from '@google/genai';
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { password, category } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized Node access.' }), { status: 401 });
    }

    const categoryPrompts: Record<string, string> = {
        philly_open: "Independent community shows, citizen journalism, or neighborhood dispatches tagged with 'Philadelphia' released 2023-2025. Look for raw, authentic community-produced content.",
        open_master: "High-production value 4K short films from Blender Studio Open Projects released 2023-2025 CC-BY license.",
        modern_short: "Independent cinematic short films from Vimeo Staff Picks or curated Vimeo groups released 2023-2025 with CC-BY license. Target authentic, community-focused narratives.",
        experimental: "Modern digital avant-garde experiments 2024-2025 explicitly released under CC0 or CC-BY.",
        doc: "Short investigative community documentaries or local video essays released 2023-2025."
    };

    const targetCategory = category as string;
    const focus = categoryPrompts[targetCategory] || categoryPrompts.modern_short;

    const prompt = `
        You are the Strategic Acquisitions lead for Crate TV.
        Your goal is to identify exactly 6 premium independent short films or community shows released between 2023 and 2025 that are distributed under Creative Commons (CC-BY) or Open Source licenses.
        
        Category Focus: ${focus}

        For each film, provide:
        - title: The verified film title.
        - director: The filmmaker name.
        - year: Release year (2023, 2024, or 2025).
        - license: The specific license (e.g., CC-BY 4.0).
        - synopsis: A 2-sentence summary emphasizing community or cultural impact.
        - sourceUrl: The direct link to the platform (Vimeo/YouTube/Studio site).
        - sourceTitle: Name of the platform or source.
        - trustLevel: 'High' if from official source, 'Medium' if from curated feed.

        Respond with ONLY a JSON object: { "films": [ { ... }, ... ] }
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
                    films: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                director: { type: Type.STRING },
                                year: { type: Type.STRING },
                                license: { type: Type.STRING },
                                synopsis: { type: Type.STRING },
                                sourceUrl: { type: Type.STRING },
                                sourceTitle: { type: Type.STRING },
                                trustLevel: { type: Type.STRING, enum: ["High", "Medium", "Unverified"] }
                            },
                            required: ["title", "director", "year", "license", "synopsis", "sourceUrl", "sourceTitle", "trustLevel"]
                        }
                    }
                },
                required: ["films"]
            }
        }
    });
    
    return new Response(response.text, { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error("Scout Intel Error:", error);
    return new Response(JSON.stringify({ error: "System scanning core failed. Re-syncing node..." }), { status: 500 });
  }
}
