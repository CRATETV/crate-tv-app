
import { Type } from '@google/genai';
import { generateContentWithRetry } from './_lib/geminiRetry.js';

export async function POST(request: Request) {
  try {
    const { password, metrics } = (await request.json()) as any;

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const prompt = `You are a growth consultant for Crate TV. registered users: ${metrics.totalUsers}. conversion: ${metrics.conversionRate.toFixed(2)}%. Provide 3 user growth, 3 revenue, 3 community strategies, and 3 ad suggestions in JSON.`;

    const response = await generateContentWithRetry({
        model: 'gemini-3-pro-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    userGrowth: { type: Type.ARRAY, items: { type: Type.STRING } },
                    revenueGrowth: { type: Type.ARRAY, items: { type: Type.STRING } },
                    communityEngagement: { type: Type.ARRAY, items: { type: Type.STRING } },
                    advertisingSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["userGrowth", "revenueGrowth", "communityEngagement", "advertisingSuggestions"]
            }
        }
    });
    
    const advice = JSON.parse(response.text || '{}');

    return new Response(JSON.stringify({ advice }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating growth advice:', error);
    return new Response(JSON.stringify({ error: `Failed: ${error instanceof Error ? error.message : "Unknown"}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
