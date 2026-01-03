
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
        You are the Executive Producer for Crate TV. Draft a professional, prestigious, and slightly elite response to the following message.
        From: ${senderName || 'Sender'}
        Category: ${type}
        Incoming Message Context: "${context}"
        
        Requirements:
        - Tone: Sophisticated, filmmaker-first, encouraging but highly professional.
        - Start with "Hello ${senderName || 'there'},"
        - Refer to Crate TV as a high-density media infrastructure for independent film.
        - Keep it concise (under 250 words).
        - End with "Best, \nThe Crate TV Studio Team"
        
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
