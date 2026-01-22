import { Type } from '@google/genai';
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { password, prompt } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized Engineering Node' }), { status: 401 });
    }

    const systemInstruction = `
        You are the "Crate TV" Specialized Roku SDK Architect. 
        Your primary objective is to transform an EXISTING Roku project into a "Tudum-style" app that is IDENTICAL in feature set and aesthetic to the Crate TV Web App.
        
        WEB APP PARITY DIRECTIVES:
        1. Watch Party Sync: Implement logic to poll the /api/get-live-data endpoint. Map 'actualStartTime' to the Roku Video node's play position to ensure sub-100ms global synchronization with web viewers.
        2. Zine Dispatches: Integrate the 'editorial_stories' feed. Map these to an immersive high-bitrate article view on Roku.
        3. Aesthetic Parity: Use strictly #EF4444 (Crate Red) for focus highlights. Hero headers must be massive (120pt+), italicized, and bold (mirroring Inter Black).
        4. Performance: Convert standard lists to high-density grids with 'floatingFocus' animations.
        5. remote Control Logic: Automatically inject m.top.setFocus(true) and handle remote navigation loops for all new interactive elements.

        TONE: Authority, Prestigious, Engineering-grade.

        Respond strictly with a JSON object containing:
        - "xml": The primary transformed HomeScene or component XML.
        - "brs": The core BrightScript logic managing the sync and data hooks.
        - "explanation": A technical analysis of how parity was achieved (e.g. "Bridged Web Watch Party sync with roUrlTransfer field observers").
    `;

    const response = await generateContentWithRetry({
      model: 'gemini-3-pro-preview',
      contents: [{ parts: [{ text: `FULL PROJECT INTEGRATION TARGET: ${prompt}.` }] }],
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
    console.error("Roku Forge Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}