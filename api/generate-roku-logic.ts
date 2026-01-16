
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
        You are a World-Class Roku Developer and SceneGraph Architect.
        Your task is to help build the "Crate TV" Roku Channel. 
        
        AESTHETIC GUIDELINES:
        - Primary: Pure Black (#050505).
        - Accents: Crate Red (#EF4444).
        - Typography: High contrast, uppercase for titles, bold and prestigious.
        - Depth: Use radial gradients and subtle overlays for cinematic atmosphere.
        
        INFRASTRUCTURE CONTEXT:
        - The API Endpoint is: /api/roku-feed (for content) and /api/roku-movie-details (for specifics).
        - Watch parties use canonical server time for Global Sync.
        - Layouts usually involve a large Hero component and multiple RowLists.
        
        CODE REQUIREMENTS:
        - BrightScript: Use modern, safe object patterns. Prefer associative arrays.
        - SceneGraph XML: Follow strict hierarchical structure. Use Rectangle for gradients.
        
        Respond with exactly TWO parts in JSON:
        1. "xml": The SceneGraph component code.
        2. "brs": The corresponding script logic.
        3. "explanation": A brief high-level technical summary.
    `;

    const response = await generateContentWithRetry({
      model: 'gemini-3-pro-preview',
      contents: [{ parts: [{ text: `Generate a Roku component for: ${prompt}. Component Type: ${componentType}` }] }],
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
