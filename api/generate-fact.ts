import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { name, bio } = await request.json();

    if (!name || !bio) {
      return new Response(JSON.stringify({ error: 'Actor name and bio are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const prompt = `Generate a single, interesting, and little-known fun fact about the actor ${name}. Their provided biography is: "${bio}". The fact should be short, engaging, and suitable for a movie app. Do not start the fact with their name. For example, instead of saying "${name} once did...", say "Once did...". The fact should be a single, concise sentence.`;

    try {
        const response = await generateContentWithRetry({
            model: 'gemini-3-flash-preview',
            contents: [{ parts: [{ text: prompt }] }],
        });
        
        const fact = response.text || "Could not generate a fun fact at this time.";

        return new Response(JSON.stringify({ fact }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
    } catch (apiError: any) {
        // If it's specifically a quota error after all retries
        if (apiError.message?.includes('429') || apiError.message?.includes('limit')) {
            return new Response(JSON.stringify({ 
                fact: "Crate TV's AI is popular! We've hit our daily discovery limit. Check back soon for more facts.",
                isQuotaError: true 
            }), {
              status: 200, // Return 200 so the app doesn't break, just shows a fallback message
              headers: { 'Content-Type': 'application/json' },
            });
        }
        throw apiError;
    }
  } catch (error) {
    console.error('Error generating fun fact:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    
    return new Response(JSON.stringify({ error: `Failed to generate fun fact: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}