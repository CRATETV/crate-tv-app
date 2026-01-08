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

    // Curate a dense catalog summary for the LLM
    const catalogList = Object.values(catalog)
        .filter((m: any) => !m.isUnlisted)
        .map((m: any) => `[KEY: ${m.key}] TITLE: "${m.title}" | DIRECTOR: ${m.director} | GENRE/AESTHETIC: ${m.synopsis.slice(0, 150)}`)
        .join('\n');

    const prompt = `
        ROLE: Editor-in-Chief of Crate Zine.
        TASK: Synthesize a highly personalized, curatorial recommendation dispatch.
        TARGET NODE: ${userName || 'Verified Patron'}
        
        SCREENING MANIFEST (History):
        ${watchedTitles.length > 0 ? watchedTitles.join(', ') : 'Manifest Empty (New Node)'}
        
        AVAILABLE CATALOG:
        ${catalogList}
        
        OBJECTIVE:
        1. Select EXACTLY ONE film from the catalog that best matches their aesthetic history.
        2. Draft a dispatch explaining the "Curatorial Alignment." Use prestigious industry terminology.
        3. Mention the specific Director of the recommended film.
        4. Focus on the "Aesthetic Continuity" between what they watched and what you're suggesting.
        
        TONE: Prestigious, authoritative, filmmaker-centric. Avoid generic marketing speak.
        
        FORMAT (JSON ONLY):
        {
            "subject": "CRATE ZINE // Curatorial Alignment: ${userName || 'Active Node'}",
            "draft": "[Full body text]",
            "recommendedKey": "[The key of the film you chose]"
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
                    draft: { type: Type.STRING },
                    recommendedKey: { type: Type.STRING }
                },
                required: ["subject", "draft", "recommendedKey"]
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