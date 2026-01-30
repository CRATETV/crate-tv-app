
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { password, target } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const prompt = `
        You are the Head of Strategic Growth at Crate TV. 
        Write a prestigious, personal, and compelling partnership offer to the filmmaker ${target.director} for their film "${target.title}" which won ${target.award}.
        
        CRITICAL NARRATIVE LEVERS:
        - "The Distribution Afterlife": Most festivals are a weekend; Crate TV is a permanent legacy.
        - "Creator-First Economics": The 70/30 split. Mention this as a standard we are fighting for.
        - "The Custom Roku Build": Their film won't just be on a website; it will be in the living room.
        - Tone: Sophisticated, intellectual, and slightly elite. Treat them like a peer, not a customer.
        - Call to Action: Invite them to a "Secure Node Review" (a private screening of their film on our infrastructure).
        
        Keep it under 300 words.
        Respond with ONLY the text of the email body.
    `;

    const response = await generateContentWithRetry({
        model: 'gemini-3-pro-preview',
        contents: [{ parts: [{ text: prompt }] }],
    });
    
    return new Response(JSON.stringify({ dispatch: response.text }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    console.error("Dispatch Generation Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
