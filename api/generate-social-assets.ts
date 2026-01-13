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

    const textPrompt = `
        You are the Head of Digital Marketing at Crate TV. 
        Create a comprehensive social media "Kit" for an upcoming LIVE WATCH PARTY event for: "${title}" directed by ${director}. 
        Synopsis: "${synopsis}".
        
        The kit must include:
        1. 3 Instagram captions (Focus on aesthetic beauty and the exclusive nature of the live chat).
        2. 3 Facebook posts (Focus on community engagement, "Watch together from home", and supporting independent artists).
        3. 5 "Story Slide" Manifests: Punchy text for Canva templates.
        4. 15 viral cinema hashtags (e.g., #CrateTV #LiveCinema #IndieFilm).
        
        Tone: Sophisticated but high-energy. Focus on FOMO (Fear of Missing Out). 
        Mention that the Director may be present in the live talkback.
        
        Respond ONLY in valid JSON.
    `;

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
            storySlides: { type: Type.ARRAY, items: { type: Type.STRING } },
            facebook: { type: Type.ARRAY, items: { type: Type.STRING } },
            hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
            pressRelease: { type: Type.STRING }
          },
          required: ["instagram", "twitter", "facebook", "hashtags", "pressRelease", "storySlides"]
        }
      }
    });

    return new Response(JSON.stringify({ 
      copy: JSON.parse(textResponse.text || '{}')
    }), { 
        status: 200, 
        headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
        } 
    });

  } catch (error) {
    console.error("Social Kit API error:", error);
    return new Response(JSON.stringify({ error: "Internal System Error" }), { status: 500 });
  }
}