import { GoogleGenAI, Type } from '@google/genai';
import { GrowthAnalyticsData } from '../types.js';

export async function POST(request: Request) {
  try {
    const { password, metrics } = (await request.json()) as { password: string, metrics: GrowthAnalyticsData['keyMetrics'] };

    // --- Authentication ---
    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
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
      You are a world-class growth strategy consultant for 'Crate TV', a niche, professional streaming service for independent films. 
      Current Stats:
      - Total Registered Users: ${metrics.totalUsers}
      - Conversion Rate (Visitors to Users): ${metrics.conversionRate.toFixed(2)}%
      - Total Platform Revenue: $${(metrics.totalRevenue / 100).toFixed(2)}
      - Catalog Size: ${metrics.totalFilms} films
      - Top Market: ${metrics.topCountries[0]?.country || 'N/A'}
      - Flagship Film: ${metrics.mostViewedFilm.title} (${metrics.mostViewedFilm.views} views)

      Context: Crate TV is built on the "Creator-Loop" model. Filmmakers bring their own tribes; we provide the stage. We want to scale to 10k users without spending $1M on traditional ads.

      Task: Provide exactly 3 concise, actionable, bullet-pointed strategies for each of the following keys:
      1. User Growth (Viral creator-led acquisition).
      2. Revenue (Monetization beyond tips).
      3. Community Engagement (The 'Watercooler' effect).
      4. Advertising Suggestions (Low-cost, high-ROAS tactical experiments).

      Your response MUST be a valid JSON object matching the provided schema.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    userGrowth: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "3 strategies to turn filmmakers into marketing engines."
                    },
                    revenueGrowth: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "3 creative monetization ideas."
                    },
                    communityEngagement: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "3 ways to build a cult-like community around these films."
                    },
                    advertisingSuggestions: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "3 specific, tactical, low-cost ad experiments."
                    }
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
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: `Failed to generate strategy: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}