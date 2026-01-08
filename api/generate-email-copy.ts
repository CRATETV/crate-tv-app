import { Type } from '@google/genai';
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { 
        password, 
        templatePrompt, 
        festivalTitle, 
        filmContext, 
        storyContext,
        blockContext,
        isReengagement,
        daysSinceLastVisit
    } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const context = `
        BRAND: Crate TV (Powered by Crate TV Infrastructure)
        STRATEGIC MODE: ${isReengagement ? 'RE-ENGAGEMENT (Dormant Node)' : 'PUBLIC DISPATCH (Active Viral Feed)'}
        UPLINK_RECENCY: ${daysSinceLastVisit || 'Unknown'} days
        FESTIVAL: ${festivalTitle || 'Crate Fest'}
        
        AMPLIFIED CONTENT:
        ${filmContext ? `FILM_MASTER: "${filmContext.title}" by ${filmContext.director}.` : ''}
        ${storyContext ? `EDITORIAL_PIECE: "${storyContext.title}".` : ''}
        ${blockContext ? `POWER_BLOCK: "${blockContext.title}" containing ${blockContext.films.join(', ')}.` : ''}
    `;

    const prompt = `
        You are the Editor-in-Chief of Crate Zine. 
        Draft a prestigious, high-impact dispatch.
        
        SPECIAL THEME: If requested in the objective, treat the content release like an "Amazon Parcel Delivery." 
        Use phrases like "Parcel successfully routed," "Delivery to Sector X," and "Secure Package Contents."
        
        Tone: Prestigious, authoritative, and sophisticated.
        
        Objective: "${templatePrompt}"
        Technical Context: ${context}
        
        Format your response as a JSON object: { "subject": "Headline", "htmlBody": "Text-based HTML" }.
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
                    htmlBody: { type: Type.STRING }
                },
                required: ["subject", "htmlBody"]
            }
        }
    });
    
    return new Response(response.text, { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    console.error("Crate Synthesis Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}