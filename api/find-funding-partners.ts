
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
        bootstrapper: "Tech startup programs for bootstrapped companies 2025, Cloud credits for non-VC startups, AWS Activate Founders",
        grants: "Independent film grants 2025, Digital literacy subsidies, NEA media projects, Public access cinema funding, Sundance Institute grants",
        philly: "Philadelphia Independence Public Media Foundation grants, Philly Cultural Fund cycles 2025, William Penn Foundation media arts"
    };

    const prompt = `
        You are a Strategic Funding Intelligence Agent for Crate TV.
        Crate TV is an independent film distribution platform based in Philadelphia.
        We have launched the "Public Square" — a dedicated grant-subsidized wing for civic dispatches, student works, and media literacy.
        
        GOAL: Identify Exactly 6 active 2025 funding programs for the category: ${type === 'grants' ? 'Media Arts and Civic Distribution' : type === 'philly' ? 'Philadelphia Regional Arts' : 'Technology Credits'}.
        
        NARRATIVE LEVERS:
        - We fight "Digital Poverty" by providing high-fidelity distribution to non-commercial work.
        - We are a "Distribution Afterlife" for filmmakers.
        - We use 70/30 creator-first economics.

        For each opportunity, provide:
        - organization: Entity name
        - program: Specific funding name
        - url: Verified portal URL
        - fit: 2-sentence explanation of why Crate TV's "Public Square" civic mission qualifies.
        - subsidy_type: (e.g. "Community Grant", "Innovation Credit", "Production Subsidy")

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
    
    return new Response(response.text, { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Funding intelligence core failure." }), { status: 500 });
  }
}
