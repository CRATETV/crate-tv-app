
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
        BRAND: Crate Zine (Powered by Crate TV Infrastructure)
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
        Draft a high-impact, prestigious dispatch that is optimized for both private email nodes and public sharing. 
        
        Brand Personality: "Crate Zine" is the definitive digital publication for the underground cinematic elite. "CRATE" is bold and italicized, while "zine" is modern and minimalist.
        
        Objective: "${templatePrompt}"
        Technical Context: ${context}
        
        Styling Directives:
        1. Header: Use a massive italicized headline. 
        2. Visual Cues: Refer to the "Zine" as the digital pulse of the independent circuit.
        3. CTAs: Focus on "SYNCHRONIZING WITH THE WORK" or "ANALYZING THE CHART". Always include a hint that the "Top 10 Today" chart has been updated.
        4. Tone: Confident, artistic, and technical.
        
        Format your response as a JSON object: { "subject": "High-Impact Viral Headline", "htmlBody": "Full HTML payload with sophisticated inline styles" }.
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
