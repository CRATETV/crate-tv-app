import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { name, bio, isProAI } = await request.json();

    if (!name || !bio) {
      return new Response(JSON.stringify({ error: 'Actor name and bio are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const prompt = `Generate a single, interesting, and little-known fun fact about the actor ${name}. Their provided biography is: "${bio}". The fact should be short, engaging, and suitable for a movie app. Do not start the fact with their name. The fact should be a single, concise sentence.`;

    try {
        /**
         * MODEL SELECTION LOGIC
         * - Lite Mode: Uses 'gemini-3-flash-preview' (Free/Low Quota)
         * - Pro Mode: Uses 'gemini-3-pro-preview' (Paid/High Quota/Higher Quality)
         */
        const model = isProAI ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
        
        const response = await generateContentWithRetry({
            model: model,
            contents: [{ parts: [{ text: prompt }] }],
            // Enable advanced reasoning if in Pro mode
            config: isProAI ? { thinkingConfig: { thinkingBudget: 4096 } } : undefined
        });
        
        const fact = response.text || "Highly versatile performer known for deep character work.";

        return new Response(JSON.stringify({ fact }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
    } catch (apiError: any) {
        // Passive handling for quota errors
        if (apiError.isQuotaError || apiError.message?.includes('8') || apiError.message?.includes('429')) {
            return new Response(JSON.stringify({ 
                fact: "Insights arriving soon! (AI service busy).",
                isQuotaError: true 
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
        }
        throw apiError;
    }
  } catch (error) {
    console.error('Error generating fun fact:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate insight.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}