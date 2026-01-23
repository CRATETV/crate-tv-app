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
        Your primary objective is to take an EXISTING Roku project and refactor it into a "Tudum-style" app that is IDENTICAL in feature set and aesthetic to the Crate TV Web App.
        
        REFACTORING PROTOCOLS:
        1. Watch Party Sync: You MUST inject logic that polls the /api/get-live-data endpoint. Map 'actualStartTime' to the Roku Video node's play position for global synchronization.
        2. Zine Integration: Ensure the app can render the 'editorial_stories' feed in an immersive article view.
        3. Aesthetic Parity: 
            - Force strictly #EF4444 (Crate Red) for all focus borders and accents. 
            - Use massive Hero headers (120pt+), italicized and bold (mirroring the Inter Black web font).
            - Set background colors to a deep #050505.
        4. Focus Management: Every interactive node must have m.top.setFocus(true) and handle remote control navigation loops.
        5. Deep Cleaning: Remove any "ghost codes" or malformed Unicode characters found in the source.

        Respond strictly with a JSON object containing:
        - "xml": The refactored HomeScene.xml or relevant visual component.
        - "brs": The refactored BrightScript logic (HomeScene.brs).
        - "explanation": A one-sentence technical analysis of how parity was integrated.
    `;

    const response = await generateContentWithRetry({
      model: 'gemini-3-pro-preview',
      contents: [{ parts: [{ text: `FULL PROJECT REFACTORING TARGET: ${prompt}.` }] }],
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
    console.error("Roku refactoring error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}