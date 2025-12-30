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

    const prompt = `Generate a short, engaging one-sentence fun fact about ${name} based on this bio: "${bio}". Do not start with their name. Focus on their professional technique or a unique career highlight mentioned.`;

    try {
        // High-throughput Flash model for low latency and high RPM limits
        const model = 'gemini-3-flash-preview';
        
        const response = await generateContentWithRetry({
            model: model,
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                temperature: 0.8,
                topP: 0.95,
                topK: 40
            }
        });
        
        const fact = response.text || "Known for bringing immense depth and authenticity to every performance.";

        return new Response(JSON.stringify({ fact }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
    } catch (apiError: any) {
        // RESILIENCY: Handle persistent Error 8 without breaking the UI
        if (apiError.isQuotaError || apiError.code === 8) {
            return new Response(JSON.stringify({ 
                fact: "Our AI is currently synthesizing new insights for your profile. Check back shortly!",
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
    return new Response(JSON.stringify({ error: 'AI analysis deferred. Profile remains stable.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}