import { Type } from '@google/genai';
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { 
        password, 
        templatePrompt, 
        festivalTitle, 
        tagline, 
        dates, 
        passPrice, 
        featuredFilms 
    } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const context = `
        FESTIVAL IDENTITY:
        Title: ${festivalTitle || 'Crate Fest'}
        Tagline: ${tagline || 'Indie cinema unleashed.'}
        Dates: ${dates || 'Coming Soon'}
        Pass Price: $${passPrice} USD
        
        ACTIVE CATALOG SPOTLIGHT:
        Films: ${featuredFilms || 'Top independent selections'}
    `;

    const prompt = `
        You are a world-class copywriter for Crate TV, an elite streaming platform for independent film. 
        Your task is to write a high-conversion marketing email based on this objective: "${templatePrompt}".
        
        Context: ${context}
        
        Requirements:
        1. Subject Line: Must be cinematic, elite, and punchy. Short and high impact.
        2. HTML Body: 
           - Use a professional dark-themed design.
           - Background: #050505
           - Text: #ffffff
           - Accents: #ef4444 (Crate Red)
           - Include a clear call to action (CTA).
           - Style it with inline CSS for maximum compatibility.
           - Ensure the tone is prestigious and supportive of indie creators.
           
        Respond with ONLY a JSON object containing "subject" and "htmlBody".
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
    console.error("Gemini Email Drafting Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}