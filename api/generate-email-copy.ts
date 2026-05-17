import { Type } from '@google/genai';
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { password, templatePrompt, storyContext } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const context = storyContext 
        ? `STORY_TITLE: "${storyContext.title}"\nSUBTITLE: "${storyContext.subtitle}"\nSUMMARY: ${JSON.stringify(storyContext.sections)}`
        : 'General Platform Update';

    const prompt = `
        You are the Editor-in-Chief of Crate Zine. 
        Draft a prestigious, high-impact dispatch.
        
        TONE: Prestigious, authoritative, filmmaker-first. Use industry terminology (e.g., "Aesthetic continuity," "Kinetic frames").
        
        OBJECTIVE: "${templatePrompt}"
        
        NARRATIVE CONTEXT:
        ${context}
        
        Format your response as a JSON object: { "subject": "Headline", "htmlBody": "Text-based HTML with high-end formatting tags (<p>, <strong>, etc.)" }.
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
    console.error("Dispatch Synthesis Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}