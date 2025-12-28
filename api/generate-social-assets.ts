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

    // 1. Generate Viral Copy + Press Release (Cheaper text quota)
    let socialCopy = null;
    try {
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
        socialCopy = JSON.parse(textResponse.text || '{}');
    } catch (textError: any) {
        if (textError.message?.includes('RESOURCE_EXHAUSTED') || textError.isQuotaError) {
            return new Response(JSON.stringify({ 
                error: "AI Quota Exceeded. The text generator is at its daily limit. Your database changes are saved, but this optional kit is unavailable.",
                isQuotaError: true 
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        throw textError;
    }

    // 2. Generate Cinematic Image (Expensive image quota)
    let base64Image = '';
    try {
        const imagePrompt = `A cinematic high-quality promotional movie still for a film titled "${title}". Directed by ${director}. 16:9 aspect ratio, no text.`;
        const imageResponse = await generateContentWithRetry({
          model: 'gemini-2.5-flash-image',
          contents: [{ parts: [{ text: imagePrompt }] }],
          config: { 
            imageConfig: { aspectRatio: "16:9" } 
          } as any
        });

        const part = imageResponse.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (part?.inlineData?.data) {
            base64Image = part.inlineData.data;
        }
    } catch (imageError: any) {
        console.warn("Image generation hit quota limit. Returning text-only kit.");
        // We let this fail silently and just return the text kit
    }

    return new Response(JSON.stringify({ 
      copy: socialCopy,
      image: base64Image,
      imageSkipped: !base64Image 
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("Social Kit API error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal Error" }), { status: 500 });
  }
}