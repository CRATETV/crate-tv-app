
import { Type } from '@google/genai';
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { password, userData, catalog } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { name, email, watchedMovies, lastSignIn } = userData;
    const watchedTitles = watchedMovies.map((key: string) => catalog[key]?.title).filter(Boolean);
    
    // Determine the "Narrative State" of the node
    const lastActiveDate = lastSignIn ? new Date(lastSignIn) : null;
    const daysAgo = lastActiveDate ? Math.floor((Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24)) : 999;
    
    let state = "ACTIVE";
    if (daysAgo > 30) state = "INACTIVE";
    else if (daysAgo > 7) state = "DORMANT";

    const prompt = `
        You are the Editor-in-Chief of Crate Zine. Draft a short, prestigious personal message to a specific node in our network.
        
        USER: ${name || 'Viewer'} (${email})
        NODE STATUS: ${state} (${daysAgo} days since last uplink)
        WATCH HISTORY: ${watchedTitles.length > 0 ? watchedTitles.join(', ') : 'No history yet'}
        
        CRATE PHILOSOPHY:
        - We are a filmmaker-first infrastructure.
        - We prioritize curation over algorithms.
        - We want to know what they thought of their last watch or invite them back to see the "Daily Chart".
        
        TONE:
        - Professional, sophisticated, slightly industrial. 
        - Not a bot. An editor reaching out to a patron.
        
        FORMAT:
        Respond with ONLY a JSON object:
        {
            "subject": "CRATE // Personal Dispatch for ${name || 'Viewer'}",
            "body": "[The email body text]"
        }
    `;

    const response = await generateContentWithRetry({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    subject: { type: Type.STRING },
                    body: { type: Type.STRING }
                },
                required: ["subject", "body"]
            }
        }
    });
    
    return new Response(response.text, { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    console.error("Direct Message Synthesis Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
