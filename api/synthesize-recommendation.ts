
import { Type } from '@google/genai';
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { password, watchedTitles, userName, catalog } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const catalogList = Object.values(catalog).map((m: any) => `"${m.title}" (Director: ${m.director}, Synopsis: ${m.synopsis.slice(0,100)}...)`).join('\n');

    const prompt = `
        You are the Editor-in-Chief of Crate Zine. We need to send a highly prestigious, curatorial recommendation to ${userName || 'a node in our network'}.
        
        THEIR RECENT MANIFEST (What they have already watched):
        ${watchedTitles.length > 0 ? watchedTitles.join(', ') : 'No films watched yet.'}
        
        AVAILABLE CATALOG:
        ${catalogList}
        
        OBJECTIVE:
        1. Identify the 1 or 2 films from our catalog they haven't watched but would LOVE based on their history.
        2. Draft a dispatch that feels like an exclusive editorial from "Crate Zine."
        3. Explain the curatorial logic using terms like "Resonated," "Aesthetic Alignment," and "Technical Pedigree."
        4. Refer to Crate TV as a high-density media infrastructure.
        
        FORMAT:
        Respond with ONLY a JSON object:
        {
            "subject": "CRATE ZINE // Curatorial Alignment: ${userName || 'Active Node'}",
            "draft": "[Full body text with line breaks]"
        }
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
                    draft: { type: Type.STRING }
                },
                required: ["subject", "draft"]
            }
        }
    });
    
    return new Response(response.text, { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    console.error("Curatorial Synthesis Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
