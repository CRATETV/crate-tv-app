
import { GoogleGenAI } from "@google/genai";

export async function POST(request: Request) {
  try {
    const { password, filmTitle, synopsis, stylePrompt } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    if (!process.env.API_KEY) {
        return new Response(JSON.stringify({ error: 'Requested entity was not found.' }), { status: 404 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Construct the refined cinematic prompt with industrial "Crate" weights
    const refinedStyle = `Industrial dark cinematic tone, high production value, impressive high-contrast lighting, mechanical movement. ${stylePrompt}`;
    const prompt = `CRATE STUDIO PRODUCTION: High-impact mood reel for "${filmTitle}". ${refinedStyle}. Narrative context: ${synopsis.slice(0, 250)}. 16:9 aspect ratio, 4k detail, professional color grade. No text overlays.`;

    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: '16:9'
      }
    });

    // Short polling cycle for Vercel execution limits
    let attempts = 0;
    while (!operation.done && attempts < 2) {
      await new Promise(resolve => setTimeout(resolve, 8000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
      attempts++;
    }

    if (operation.done) {
        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        return new Response(JSON.stringify({ videoUrl: `${downloadLink}&key=${process.env.API_KEY}` }), { status: 200 });
    } else {
        return new Response(JSON.stringify({ error: 'Synthesis ongoing in background. Re-check the Studio shortly.' }), { status: 202 });
    }

  } catch (error: any) {
    console.error("Veo Studio Error:", error);
    const msg = error.message || "";
    if (msg.includes("Requested entity was not found")) {
        return new Response(JSON.stringify({ error: 'Requested entity was not found.' }), { status: 404 });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
