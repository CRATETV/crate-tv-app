
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { password, type, organization } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const prompt = `
        You are a professional grant writer. Write a 3-paragraph "Business Description & Mission" for a grant application.
        Organization: Crate TV
        Target Grantor: ${organization}
        Grant Type: ${type}
        
        Context:
        - Mission: The afterlife of independent cinema. 
        - Technology: AWS S3 backend, Gemini AI integration, custom Roku SDK.
        - Split: 70/30 creatorSplit.
        - Location: Philadelphia, PA.
        
        Tone: Prestigious, authoritative, and data-driven. Focus on community impact and technical scalability.
        Format: Plain text with section headers.
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
