import { GoogleGenAI, Type } from '@google/genai';

export async function POST(request: Request) {
  try {
    const { title, synopsis, director, password } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Admin password mismatch' }), { status: 401 });
    }

    if (!process.env.API_KEY) throw new Error("API_KEY environment variable is not configured on the server.");

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // 1. Generate Viral Copy + Press Release
    const textPrompt = `
      You are a specialized publicist for Crate TV.
      Task: Create a social media "Kit" AND an Industry Press Release for:
      Title: "${title}"
      Director: "${director}"
      Synopsis: "${synopsis}"

      Generate:
      - 3 Instagram Captions.
      - 3 X (Twitter) Posts.
      - 3 Facebook Posts.
      - 15 hashtags.
      - A professional, standard-format Press Release (FOR IMMEDIATE RELEASE).

      Response must be valid JSON matching the schema.
    `;

    const textResponse = await ai.models.generateContent({
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

    const rawText = textResponse.text;
    if (!rawText) throw new Error("The AI failed to generate text content (likely blocked by safety filters).");

    const startIdx = rawText.indexOf('{');
    const endIdx = rawText.lastIndexOf('}');
    if (startIdx === -1 || endIdx === -1) throw new Error("The AI response was not in a valid JSON format.");
    const cleanJson = rawText.substring(startIdx, endIdx + 1);
    const socialCopy = JSON.parse(cleanJson);

    // 2. Generate Cinematic Image
    const imagePrompt = `A cinematic high-quality promotional movie still for a film titled "${title}". Directed by ${director}. High-end cinematography, 16:9 aspect ratio, dramatic cinematic lighting, movie set atmosphere. No text, subtitles, or logos.`;
    const imageResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: [{ text: imagePrompt }] }],
      config: { 
        imageConfig: { aspectRatio: "16:9" } 
      } as any
    });

    let base64Image = '';
    const candidates = imageResponse.candidates;
    if (candidates && candidates.length > 0) {
        const parts = candidates[0].content?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData) { 
                    base64Image = part.inlineData.data ?? ''; 
                    break; 
                }
            }
        }
    }

    return new Response(JSON.stringify({ 
      copy: socialCopy,
      image: base64Image 
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("Social Kit API error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected server error occurred during AI synthesis.";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}