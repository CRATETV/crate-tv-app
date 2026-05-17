
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { bio } = await request.json();
    if (!bio) return new Response(JSON.stringify({ error: 'Bio required' }), { status: 400 });

    const prompt = `
        You are a top-tier Hollywood talent agent. Rewrite the following actor bio to be prestigious, punchy, and highly professional. 
        Focus on their craft, technique, and artistic impact. 
        Remove any informal language. Keep it under 150 words.
        
        Original Bio: "${bio}"
        
        Respond with ONLY the rewritten text.
    `;

    const response = await generateContentWithRetry({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
    });
    
    return new Response(JSON.stringify({ polishedBio: response.text }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
