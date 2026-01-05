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
        open_master: "High-quality 4k short films released by Blender Studio or similar open-source studios 2023-2025 CC-BY license",
        modern_short: "Award-winning independent short films released on Vimeo or YouTube with Creative Commons CC-BY 2023-2025",
        experimental: "Modern experimental and avant-garde short films released 2024-2025 with Creative Commons license",
        doc: "Contemporary short documentaries or investigative video essays 2023-2025 with Creative Commons redistribution license"
    };

    const prompt = `
        You are the Head of Modern Acquisitions for Crate TV. 
        Your goal is to identify 6 high-production value, MODERN films released between 2023 and 2025 that are licensed under Creative Commons (specifically CC-BY or CC-BY-SA).
        
        Search Sector: ${categoryPrompts[category as keyof typeof categoryPrompts] || categoryPrompts.open_master}
        
        Requirements:
        1. ONLY include films released in 2023, 2024, or 2025. 
        2. Prioritize films with high production quality (Cinematic, 4K, professional color grade).
        3. Identify specific titles found on Vimeo, YouTube (Creative Commons filtered), or Open Source Studio repositories.
        4. Do NOT return old public domain films.
        
        Provide:
        - title: The full film title
        - director: Name of the director or studio
        - year: Release year (MUST be 2023-2025)
        - license: Specific CC license (e.g., "CC-BY 4.0")
        - synopsis: 2-3 sentence engaging summary
        - sourceUrl: Direct URL to the verified landing page
        - sourceTitle: Platform name (e.g. "Vimeo", "YouTube", "Blender Studio")
        
        Format your response as a JSON object: { "films": [ { ... }, ... ] }
    `;

    // Use gemini-3-pro-preview for complex search and grounding tasks
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
                                sourceTitle: { type: Type.STRING }
                            },
                            required: ["title", "director", "year", "license", "synopsis", "sourceUrl", "sourceTitle"]
                        }
                    }
                },
                required: ["films"]
            }
        }
    });
    
    // Log sources for transparency
    console.log("Modern Grounding Links Found:", response.candidates?.[0]?.groundingMetadata?.groundingChunks);

    return new Response(response.text, { 
        status: 200, 
        headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
        } 
    });

  } catch (error) {
    console.error("Modern Scout Engine Failure:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Contemporary infrastructure scan interrupted." }), { status: 500 });
  }
}