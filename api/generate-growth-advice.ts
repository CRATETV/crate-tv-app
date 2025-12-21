
import { GoogleGenAI, Type } from '@google/genai';
import { GrowthAnalyticsData, AiGrowthAdvice, Movie } from '../types.js';

export async function POST(request: Request) {
  try {
    const { password, metrics } = (await request.json()) as { password: string, metrics: GrowthAnalyticsData['keyMetrics'] };

    // --- Authentication & Validation ---
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
      - Users: ${metrics.totalUsers}
      - Total Revenue: $${(metrics.totalRevenue / 100).toFixed(2)}
      - Catalog Size: ${metrics.totalFilms} films
      - Top Market: ${metrics.topCountries[0]?.country || 'N/A'}
      - Top Performing Film: ${metrics.mostViewedFilm.title}

      Strategic Narrative: Crate TV grows by leveraging the "Creator-Loop." Filmmakers have existing social circles; Crate TV provides the stage. Your advice should focus on how to make filmmakers the ultimate marketing agents for the platform.

      Task: Provide a concise list of actionable strategies to:
      1. Scale Users (focus on viral creator-led sharing).
      2. Optimize Revenue (focus on high-intent sponsorship and tips).
      3. Retain Community (focus on Watch Party dynamics).
      4. Advertising: Suggest 3 specific, low-cost advertising experiments (e.g. niche subreddits, geo-targeted ads).

      Your response must be a JSON object matching the provided schema.
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
                        description: "Strategies to turn creators into marketers.",
                        items: { type: Type.STRING }
                    },
                    revenueGrowth: {
                        type: Type.ARRAY,
                        description: "Creative monetization beyond just donations.",
                        items: { type: Type.STRING }
                    },
                    communityEngagement: {
                        type: Type.ARRAY,
                        description: "Building a cult-following around indie cinema.",
                        items: { type: Type.STRING }
                    },
                    advertisingSuggestions: {
                        type: Type.ARRAY,
                        description: "Specific advertising experiments.",
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