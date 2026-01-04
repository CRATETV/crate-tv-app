
import { Type } from '@google/genai';
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { title, synopsis, director, password } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // 1. Generate Viral Copy + Press Release
    const textPrompt = `Create a social media "Kit" (3 IG, 3 X, 3 FB, 15 hashtags) and Press Release for: "${title}" by ${director}. Synopsis: "${synopsis}". Respond in JSON.`;
    const textResponse = await generateContentWithRetry({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: textPrompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            instagram: { type: Type.ARRAY, items: { type: Type.STRING } },
            twitter: { type: Type.ARRAY, items: { type: Type.STRING } },
            facebook: { type: Type.ARRAY, items: { type: Type.STRING } },
            hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
            pressRelease: { type: Type.STRING }
          },
          required: ["instagram", "twitter", "facebook", "hashtags", "pressRelease"]
        }
      }
    });

    // 2. Generate Cinematic Image
    const imagePrompt = `A cinematic high-quality promotional movie still for a film titled "${title}". Directed by ${director}. 16:9 aspect ratio, no text.`;
    const imageResponse = await generateContentWithRetry({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: [{ text: imagePrompt }] }],
      config: { 
        imageConfig: { aspectRatio: "16:9" } 
      } as any
    });

    let base64Image = '';
    const part = imageResponse.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (part?.inlineData?.data) {
        base64Image = part.inlineData.data;
    }

    return new Response(JSON.stringify({ 
      copy: JSON.parse(textResponse.text || '{}'),
      image: base64Image 
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("Social Kit API error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal Error" }), { status: 500 });
  }
}
