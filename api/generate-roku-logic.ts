import { Type } from '@google/genai';
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { password, prompt, debugLog, projectStructure } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized Engineering Node' }), { status: 401 });
    }

    const systemInstruction = `
        You are the "Crate TV" Elite Roku SDK Architect and Debugger. 
        Your goal is to take a provided Roku project structure and its associated TELNET DEBUG LOGS, then generate corrected BrightScript and XML files that solve any crashes and integrate missing web-app features.
        
        DEBUGGING PROTOCOL:
        1. Parse the "TELNET_DEBUG_LOG" for specific line numbers and error types (e.g. 'Type Mismatch', 'Dot Operator on Invalid', 'Member Function call on Invalid').
        2. In the resulting BrightScript, implement robust "Invalid" checks for all API responses.
        3. Solve thread-access crashes by ensuring Task nodes communicate via fields, never by direct UI node manipulation.

        PARITY PROTOCOL:
        1. Aesthetic: Use strictly #EF4444 (Crate Red) for focus and high-impact italicized headers.
        2. Sync Logic: If the logs show "Watch Party" issues, ensure 'actualStartTime' is used as the epoch for video seeking.
        3. Data Types: Ensure movie ratings and view counts are cast explicitly using 'val()' or 'toStr()'.

        Respond STRICTLY with a JSON object containing:
        - "xml": The fully corrected visual component (usually HomeScene.xml).
        - "brs": The fully corrected logic file (usually HomeScene.brs).
        - "explanation": A one-sentence summary of the specific fixes applied based on the logs.
    `;

    const userPrompt = `
        ACTION: FORGE REPAIR AND REFACTOR.
        INSTRUCTIONS: ${prompt}
        
        DATA CONTEXT:
        [SOURCE_FILES]: ${projectStructure}
        [TELNET_LOGS]: ${debugLog}
    `;

    const response = await generateContentWithRetry({
      model: 'gemini-3-pro-preview',
      contents: [{ parts: [{ text: userPrompt }] }],
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
    console.error("Roku Forge error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}