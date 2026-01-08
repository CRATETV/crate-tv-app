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
        bootstrapper: "Cloud startup programs for unfunded/bootstrapped companies 2025, AWS Activate Founders, Google Cloud pre-seed credits, Microsoft Founders Hub credits",
        grants: "Independent film distribution grants 2025, Social impact media funding, National Endowment for the Arts media projects",
        philly: "Philadelphia Cultural Fund 2025, PA small business tech grants, Philadelphia creative economy subsidies"
    };

    const prompt = `
        You are a Strategic Financial Advisor for Crate TV. 
        Crate TV is a bootstrapped independent film streaming platform based in Philadelphia.
        
        GOAL: Identify funding sources that do NOT require VC backing or institutional series funding.
        TARGET SECTOR: ${typeQueries[type as keyof typeof typeQueries] || typeQueries.bootstrapper}

        REQUIREMENTS:
        1. Identify exactly 6 REAL-WORLD programs active in 2025.
        2. EXCLUDE Vercel for Startups (already rejected due to VC requirement).
        3. FOCUS ON: AWS Activate Founders (up to $5k credits), Microsoft Founders Hub ($2.5k OpenAI credits), and regional Philadelphia arts grants.
        
        For each, provide:
        - organization: Name of entity
        - program: Specific funding or credit name
        - url: Verified official website
        - fit: 2-sentence explanation of why Crate TV (bootstrapped media infrastructure) qualifies.
        - subsidy_type: (e.g. "Cloud Credits", "Cash Grant", "In-Kind")

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