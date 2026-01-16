
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
        prestige_shorts: "Identify high-class independent short films that have won awards or were official selections at major festivals (Sundance, SXSW, Berlinale, Cannes) and are currently available on platforms like Shortverse, Vimeo, or official filmmaker sites. These do not need to be Creative Commons; identify them as negotiation targets.",
        vimeo_staff: "Scout Vimeo Staff Picks or curated Vimeo channels for independent cinematic short films released 2023-2025 that explicitly use a Creative Commons (CC-BY or CC-BY-SA) license. Focus on high production value narratives.",
        philly_open: "Independent community shows, citizen journalism, or neighborhood dispatches tagged with 'Philadelphia' released 2023-2025. Look for raw, authentic community-produced content on YouTube or Vimeo.",
        experimental: "Modern digital avant-garde experiments 2024-2025 explicitly released under CC0 or CC-BY on platforms like Archive.org or Vimeo.",
    };

    const targetCategory = category as string;
    const focus = categoryPrompts[targetCategory] || categoryPrompts.prestige_shorts;

    const prompt = `
        You are the Strategic Acquisitions lead for Crate TV.
        Your goal is to identify exactly 6 premium independent short films, prestigious shows, or community dispatches released between 2023 and 2025.
        
        Category Focus: ${focus}

        For each film, provide:
        - title: The verified film title.
        - director: The filmmaker name.
        - year: Release year (2023, 2024, or 2025).
        - license: The specific license (e.g., CC-BY 4.0) or 'Standard Copyright'.
        - synopsis: A 2-sentence summary highlighting why it is "High Class" (e.g. awards, unique technique).
        - sourceUrl: The direct link to the platform (Shortverse/Vimeo/YouTube/Filmmaker Site).
        - sourceTitle: Name of the platform or source.
        - trustLevel: 'High' if from official source, 'Medium' if from curated feed.
        - acquisitionMode: 'INGEST' if license is CC-BY/Open Source, 'NEGOTIATE' if standard copyright or high prestige.

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
                                trustLevel: { type: Type.STRING, enum: ["High", "Medium", "Unverified"] },
                                acquisitionMode: { type: Type.STRING, enum: ["INGEST", "NEGOTIATE"] }
                            },
                            required: ["title", "director", "year", "license", "synopsis", "sourceUrl", "sourceTitle", "trustLevel", "acquisitionMode"]
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
