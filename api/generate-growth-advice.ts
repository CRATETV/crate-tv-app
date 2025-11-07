import { GoogleGenAI, Type } from '@google/genai';
import { GrowthAnalyticsData, AiGrowthAdvice, Movie } from '../types.js';

export async function POST(request: Request) {
  try {
    const { password, metrics } = (await request.json()) as { password: string, report: GrowthAnalyticsData, metrics: GrowthAnalyticsData['keyMetrics'] };

    // --- Authentication ---
    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    // FIX: Corrected the logical AND to check against the master password correctly.
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable is not set.");
    }
    if (!metrics) {
        return new Response(JSON.stringify({ error: 'Current metrics are required to generate advice.' }), { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      You are a growth strategy consultant for 'Crate TV', a niche streaming service for independent films. 
      The platform currently has approximately ${metrics.totalUsers} users and has generated a total of $${(metrics.totalRevenue / 100).toFixed(2)} in revenue.
      The platform's key features include a Roku channel, live watch parties with chat, direct filmmaker donations, and filmmaker/actor portals.

      Provide a concise list of actionable, creative, and specific strategies to grow the user base, increase revenue, and improve community engagement.
      Your response must be a JSON object.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    userGrowth: {
                        type: Type.ARRAY,
                        description: "Actionable strategies to attract new users.",
                        items: { type: Type.STRING }
                    },
                    revenueGrowth: {
                        type: Type.ARRAY,
                        description: "Creative ways to increase platform revenue.",
                        items: { type: Type.STRING }
                    },
                    communityEngagement: {
                        type: Type.ARRAY,
                        description: "Ideas to make the community more active and engaged.",
                        items: { type: Type.STRING }
                    }
                }
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
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: `Failed to generate advice: ${errorMessage}` }), {
      status: 500,
    });
  }
}
