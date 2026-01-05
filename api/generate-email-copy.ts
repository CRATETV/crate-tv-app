
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
        Draft a high-impact, prestigious dispatch optimized to pass modern SPAM FILTERS. 
        
        Brand Personality: "Crate Zine" is the definitive digital publication for the underground cinematic elite.
        
        SPAM MITIGATION RULES:
        1. Maintain a high TEXT-TO-IMAGE ratio. 
        2. Do not use spammy trigger words like "Free," "Win," or "Cash." Use "Complimentary," "Selection," or "Patronage."
        3. Ensure the HTML is simple and uses standard web-safe fonts (Helvetica, Arial, sans-serif).
        4. Use a clear, descriptive Subject line.
        
        Objective: "${templatePrompt}"
        Technical Context: ${context}
        
        Styling Directives:
        1. Body: Use a structured layout with clearly defined paragraphs.
        2. Visual Cues: Refer to the "Zine" as the digital pulse of the independent circuit.
        3. CTAs: Focus on "SYNCHRONIZING WITH THE WORK" or "ANALYZING THE CHART."
        
        Format your response as a JSON object: { "subject": "High-Impact Viral Headline", "htmlBody": "Clean, well-spaced HTML body content" }.
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
