
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { password, context, senderName, type } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const prompt = `
        You are the Editor-in-Chief of Crate Zine. Draft a professional, prestigious, and slightly elite response to the following transmission.
        From: ${senderName || 'Active Node'}
        Category: ${type}
        Incoming Payload Context: "${context}"
        
        Requirements:
        - Tone: Sophisticated, filmmaker-first, encouraging but highly industrial/professional.
        - Strategic Objective: Re-establish the "Habit Loop." Mention that the "Daily Chart" has been recalculated.
        - Start with "Hello ${senderName || 'there'},"
        - Refer to Crate Zine as the definitive digital record of the independent cinematic underground.
        - Keep it concise (under 200 words).
        - Use "High-Velocity Hooks": intriguing questions about their work or specific aesthetic observations.
        - End with "In pursuit of the work, \nThe Crate Zine Editorial Team"
        
        Respond with ONLY the plain text of the email body.
    `;

    const response = await generateContentWithRetry({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
    });
    
    return new Response(JSON.stringify({ draft: response.text }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
