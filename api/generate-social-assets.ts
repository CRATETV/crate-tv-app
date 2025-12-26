import { GoogleGenAI, Type } from '@google/genai';

export async function POST(request: Request) {
  try {
    const { title, synopsis, director, password } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    if (!process.env.API_KEY) throw new Error("API_KEY not set.");

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Generate Viral Copy + Press Release
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
      contents: textPrompt,
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

    const socialCopy = JSON.parse(textResponse.text || '{}');

    // Generate Cinematic Image
    const imageResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ text: `A cinematic promotional movie still for "${title}". No text. 16:9.` }],
      config: { imageConfig: { aspectRatio: "16:9" } }
    });

    let base64Image = '';
    for (const part of imageResponse.candidates[0].content.parts) {
      if (part.inlineData) { base64Image = part.inlineData.data; break; }
    }

    return new Response(JSON.stringify({ 
      copy: socialCopy,
      image: base64Image 
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}