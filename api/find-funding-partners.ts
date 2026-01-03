
import { GoogleGenAI, Type } from '@google/genai';
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { password, type } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const typeQueries = {
        infrastructure: "AWS Activate credits for startups 2025, Google Cloud for Startups credits, Azure for Startups eligibility, media infrastructure grants for tech platforms",
        grants: "Independent film distribution grants 2025, film festival technology sponsorships, National Endowment for the Arts media grants, Sundance Institute technology funding",
        philly: "Philadelphia arts and technology grants 2025, PA media subsidies for small businesses, Philadelphia Cultural Fund grants, tech-arts initiatives in Greater Philadelphia"
    };

    const prompt = `
        You are a strategic financial advisor for Crate TV, an independent film streaming platform based in Philadelphia.
        Crate TV uses AWS S3, Vercel, and Google APIs and seeks organizations that provide cloud credits or grants to offset these costs.

        Target Research: ${typeQueries[type as keyof typeof typeQueries] || typeQueries.infrastructure}

        Identify exactly 6 real-world organizations or specific programs that are currently active in 2025.
        For each, provide:
        - organization: Name of the entity
        - program: Specific funding or credit program
        - url: Valid official website URL (must be verified)
        - fit: 2-sentence explanation of why this fits Crate TV's mission (indie film streaming + creator support)
        - subsidy_type: (e.g. "Cloud Credits", "Cash Grant", "Corporate Sponsorship")

        Respond with ONLY a JSON object: { "partners": [ { ... }, ... ] }
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
                    partners: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                organization: { type: Type.STRING },
                                program: { type: Type.STRING },
                                url: { type: Type.STRING },
                                fit: { type: Type.STRING },
                                subsidy_type: { type: Type.STRING }
                            },
                            required: ["organization", "program", "url", "fit", "subsidy_type"]
                        }
                    }
                },
                required: ["partners"]
            }
        }
    });
    
    // Log sources for transparency (required by guidelines)
    console.log("Grounding Metadata:", response.candidates?.[0]?.groundingMetadata);

    return new Response(response.text, { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error("Funding Intel Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Intelligence core unreachable." }), { status: 500 });
  }
}
