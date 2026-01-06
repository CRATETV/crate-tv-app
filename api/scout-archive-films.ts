import { GoogleGenAI, Type } from '@google/genai';
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { password, category } = await request.json();

    // 1. Authentication check
    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized Node access.' }), { status: 401 });
    }

    const categoryPrompts = {
        open_master: "High-production value short films from Blender Studio (Open Projects) released 2023-2025 CC-BY license. Look for titles like 'Charge', 'Wing It!', etc.",
        modern_short: "Independent cinematic short films from Vimeo Staff Picks or curated Vimeo CC groups released 2023-2025 with CC-BY license only.",
        experimental: "Modern digital avant-garde and AI-assisted films 2024-2025 explicitly released under CC0 or CC-BY on platforms like Archive.org or Open Culture.",
        doc: "Short investigative documentaries or video essays released 2023-2025 by independent journalists using Creative Commons redistribution licenses."
    };

    const prompt = `
        You are the Strategic Acquisitions lead for Crate TV. 
        Your objective is to identify exactly 6 MODERN films released between 2023 and 2025 that are legally licensed under Creative Commons (CC-BY, CC-BY-SA, or CC0).
        
        Search Target: ${categoryPrompts[category as keyof typeof categoryPrompts] || categoryPrompts.open_master}
        
        Rigid Requirements:
        1. NO VINTAGE FILMS. Release year must be 2023, 2024, or 2025.
        2. VERIFIED SOURCES ONLY: Focus on Blender Studio, Vimeo (filter for CC-BY), and Open Source Cinema production houses.
        3. HIGH QUALITY: Only include films that are 4K or high-bitrate cinematic quality.
        
        Provide:
        - title: The full film title
        - director: Name of the director or studio (e.g. "Blender Studio")
        - year: Release year (2023-2025)
        - license: Specific CC version (e.g., "CC-BY 4.0")
        - synopsis: 2-3 sentence prestigious summary
        - sourceUrl: Direct URL to the verified repository landing page
        - sourceTitle: Platform name (e.g. "Blender Studio", "Vimeo CC")
        - trustLevel: "High" if from an official studio site like Blender, "Medium" if from a curated user feed.
        
        Format your response as a JSON object: { "films": [ { ... }, ... ] }
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
        headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
        } 
    });

  } catch (error) {
    console.error("Modern Scout Failure:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Infrastructure scan interrupted." }), { status: 500 });
  }
}