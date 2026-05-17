
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
        You are an AI Data Specialist (Pilot) for Crate TV. 
        Your goal is to simulate a scrape of the top 2025 independent film trends from Vimeo Staff Picks, Shortverse, and Letterboxd.
        
        TASK:
        1. Identify 6 "Cinematic Aesthetic Trends" currently gaining massive audience velocity.
        2. Structure this data into a clean JSON manifest.
        
        For each insight, provide:
        - trend: The name of the trend (e.g. "Lo-Fi 16mm Neo-Realism")
        - platform: Where the data was scraped from
        - velocity: A growth score (e.g. "Viral: +420% MoM")
        - implication: 1 sentence on why Crate TV should acquire films in this category.

        Respond with ONLY a JSON object: { "insights": [ { ... }, ... ] }
    `;

    const response = await generateContentWithRetry({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    insights: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                trend: { type: Type.STRING },
                                platform: { type: Type.STRING },
                                velocity: { type: Type.STRING },
                                implication: { type: Type.STRING }
                            },
                            required: ["trend", "platform", "velocity", "implication"]
                        }
                    }
                },
                required: ["insights"]
            }
        }
    });
    
    return new Response(response.text, { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    console.error("Scraper Lab Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
