
import { Type } from '@google/genai';
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { password, target, metrics } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const targetContexts: Record<string, string> = {
        aws: "Focus on technical scalability, S3 efficiency, and AI-driven curation.",
        investor: "Focus on ARPU, conversion rates, and the 'Distribution Afterlife' as an untapped market segment.",
        press: "Focus on the 'Revolutionary Cinema' narrative and the death of traditional gatekeepers."
    };

    const context = targetContexts[target] || targetContexts.aws;

    const prompt = `
        You are the Head of Strategic Communications for Crate TV.
        Synthesize a high-impact marketing manifest for the following profile: ${target.toUpperCase()}.
        CONTEXT: ${context}
        
        PLATFORM STATS:
        - Nodes Online (Live): ${metrics?.liveNodes || 'Scaling'}
        - Infrastructure: AWS S3, Vercel, Gemini AI Core.
        - Strategic Asset: The custom Roku SDK for Big Screen distribution.
        
        OBJECTIVE:
        Generate professional, prestigious, and slightly elite copy that emphasizes our "Distribution Afterlife" mission. 
        
        RIGID CONSTRAINT:
        The "shortDesc" field MUST NOT exceed 160 characters including spaces.
        
        FORMAT:
        Respond with ONLY a JSON object:
        {
            "manifest": {
                "tagline": "A punchy 8-word header",
                "shortDesc": "A high-impact elevator pitch of MAXIMUM 160 characters",
                "problem": "The specific market failure we solve (The Festival Void)",
                "solution": "How Crate TV (scaled by AWS) solves this",
                "impact": "The result for filmmakers and partners"
            }
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
                    manifest: {
                        type: Type.OBJECT,
                        properties: {
                            tagline: { type: Type.STRING },
                            shortDesc: { type: Type.STRING },
                            problem: { type: Type.STRING },
                            solution: { type: Type.STRING },
                            impact: { type: Type.STRING }
                        },
                        required: ["tagline", "shortDesc", "problem", "solution", "impact"]
                    }
                }
            }
        }
    });
    
    return new Response(response.text, { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
