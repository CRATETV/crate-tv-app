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

    // --- TEMPORAL ROTATION LOGIC ---
    // Calculate an index that changes every 14 days
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysSinceEpoch = Math.floor(Date.now() / msPerDay);
    const fortnightIndex = Math.floor(daysSinceEpoch / 14);
    
    // Rotating focus sectors to ensure variety in results
    const focusSectors = [
        "Private philanthropic foundations and high-net-worth arts donors",
        "Corporate Social Responsibility (CSR) technology and media grants",
        "Government municipal and state arts endowment opportunities (PA/National)",
        "Emerging media technology incubators and Web3/Creator ecosystem credits",
        "Diversity-focused media subsidies and independent filmmaker grants"
    ];
    const currentFocus = focusSectors[fortnightIndex % focusSectors.length];

    const typeQueries = {
        infrastructure: "AWS Activate for startups 2025, Google Cloud credits for media platforms, Vercel startup program, digital infrastructure subsidies",
        grants: "Independent film distribution grants 2025, Film festival tech sponsorships, National Endowment for the Arts media projects",
        philly: "Philadelphia Cultural Fund 2025, PA media subsidies for small businesses, Greater Philadelphia technology grants"
    };

    const prompt = `
        You are a Strategic Financial Advisor for Crate TV. 
        Crate TV is an independent film streaming platform based in Philadelphia using AWS and Google Cloud.
        
        CURRENT RESEARCH CYCLE: ${fortnightIndex}
        TEMPORAL FOCUS: ${currentFocus}
        TARGET SECTOR: ${typeQueries[type as keyof typeof typeQueries] || typeQueries.infrastructure}

        REQUIREMENTS:
        1. Identify exactly 6 REAL-WORLD organizations or specific programs active in 2025.
        2. Verify via search grounding that they are currently accepting applications.
        3. Prioritize ${currentFocus} for this cycle.
        4. Do NOT repeat high-level generic results unless they have a new 2025 window.

        For each, provide:
        - organization: Name of entity
        - program: Specific funding or credit name
        - url: Verified official website
        - fit: 2-sentence explanation of alignment with Crate TV's mission
        - subsidy_type: (e.g. "Cloud Credits", "Cash Grant", "Sponsorship")

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