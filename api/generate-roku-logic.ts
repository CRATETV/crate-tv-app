import { Type } from '@google/genai';
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { password, prompt, componentType } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized Engineering Node' }), { status: 401 });
    }

    const systemInstruction = `
        You are a Specialized Roku SDK Compiler Core. 
        Your task is to translate standard Web App code (HTML5/React/JS) into Roku SceneGraph (XML/BrightScript).
        
        MAPPING PROTOCOLS:
        1. UI Mapping: Map CSS Flexbox/Grid layouts to Roku RowList or MarkupGrid.
        2. Networking: Convert JavaScript fetch() or Axios calls to Roku's roUrlTransfer object.
        3. Media: Convert HTML5 Video API to Roku Video node field observers.
        4. Focus: Automatically inject Focus Management logic (e.g., m.top.setFocus(true)) for remote control navigation.
        5. Storage: Translate localStorage into Roku's Registry.
        
        TONE: Prestigious, authoritative, and technical.
        
        Respond with exactly THREE parts in JSON:
        1. "xml": The SceneGraph XML component code.
        2. "brs": The corresponding BrightScript logic.
        3. "explanation": A summary of the semantic translation (e.g. "Mapped web carousel to RowList with lazy loading").
    `;

    const response = await generateContentWithRetry({
      model: 'gemini-3-pro-preview',
      contents: [{ parts: [{ text: `TRANSPILATION TARGET: ${prompt}. TASK: Generate Roku compliant SDK files.` }] }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            xml: { type: Type.STRING },
            brs: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["xml", "brs", "explanation"]
        }
      }
    });

    return new Response(response.text, { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error("Roku Logic Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}