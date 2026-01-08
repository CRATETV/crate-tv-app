import { GoogleGenAI } from "@google/genai";

export async function POST(request: Request) {
  try {
    const { password, type, context } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    if (!process.env.API_KEY) {
        return new Response(JSON.stringify({ error: 'API Key missing.' }), { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Technical Prompting for Cinematic Startup Aesthetics
    const prompt = `
        CRATE TV BRAND FORGE: Generate a professional cinematic header image for a film startup called Crate TV.
        
        USE CASE: ${context}
        AESTHETIC: Industrial elite, high-contrast, Netflix-style dark mode. 
        BACKGROUND: Moody atmosphere with subtle red radial glow, cinematic film grain, or macro camera lens textures.
        ELEMENTS: Centered "Crate TV" logo (clean modern sans-serif).
        MOOD: Prestigious, imposing, established media infrastructure.
        ASPECT: 16:9 cinematic landscape. 
        NO TEXT OTHER THAN LOGO. HIGH BITRATE 4K DETAIL.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    let imageUrl = '';
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) throw new Error("Image generation failed.");

    return new Response(JSON.stringify({ imageUrl }), { status: 200 });

  } catch (error: any) {
    console.error("Brand Forge Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
