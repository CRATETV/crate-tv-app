
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
        You are a Senior Technical Recruiter specializing in OTT (Over-The-Top) Media and AI Engineering roles for firms like Insight Global.
        
        TASK:
        Look at the following architectural manifest of "Crate TV" (the user's project).
        
        PROJECT_MANIFEST:
        - Tech Stack: React, TypeScript, Tailwind, Firebase (Firestore, Auth, Functions), AWS S3.
        - Media Features: Native Roku SDK (BrightScript/SceneGraph) integration, high-bitrate streaming, custom VOD paywall (Square SDK).
        - AI Features: Real-time Gemini 3 Pro integration, retry-logic/resilience middleware, autonomous agents for grant writing and research.
        - Analytics: Audience sentiment mapping, geographic traffic bifurcation, filmmaker payout automation (70/30 split logic).
        
        OBJECTIVE:
        1. Identify 4 "Rare Technical Skills" the builder of this platform has.
        2. Create 4 "Corporate Impact Bullet Points" for a Resume. These must sound prestigious and quantified.
        3. Draft a 3-sentence "Recruiter Pitch" that a candidate would send to an Insight Global agent. 
           - Mention: "Lead Architect of Crate TV."
           - Mention: "End-to-end OTT distribution infrastructure."
           - Mention: "Production-ready AI resilience engines."
           
        FORMAT (JSON ONLY):
        {
            "intel": [
                { "rareSkill": "...", "description": "...", "bulletPoint": "..." }
            ],
            "pitch": "..."
        }
    `;

    const response = await generateContentWithRetry({
        model: 'gemini-3-pro-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    intel: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                rareSkill: { type: Type.STRING },
                                description: { type: Type.STRING },
                                bulletPoint: { type: Type.STRING }
                            },
                            required: ["rareSkill", "description", "bulletPoint"]
                        }
                    },
                    pitch: { type: Type.STRING }
                },
                required: ["intel", "pitch"]
            }
        }
    });
    
    return new Response(response.text, { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    console.error("Career Intel Synthesis Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
