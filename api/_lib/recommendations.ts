import { GoogleGenAI, Type } from "@google/genai";
import { Movie } from "../../types.js";

export interface Recommendation {
  movieKey: string;
  reasoning: string;
}

export async function getAiRecommendations(
  allMovies: Movie[],
  watchlist: string[] = [],
  likedMovies: string[] = []
): Promise<Recommendation[]> {
  try {
    if (allMovies.length === 0) return [];

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set, skipping AI recommendations");
      return [];
    }
    
    const ai = new GoogleGenAI({ apiKey });
    
    // Prepare movie metadata for Gemini - limit to essential info to save tokens
    const movieCatalog = allMovies.map(m => ({
      key: m.key,
      title: m.title,
      synopsis: (m.synopsis || '').substring(0, 200) + '...',
      director: m.director,
      cast: m.cast?.slice(0, 3).map(a => a.name).join(', ')
    }));

    const userProfile = {
      watchlist: watchlist.map((key: string) => allMovies.find(m => m.key === key)?.title).filter(Boolean),
      likedMovies: likedMovies.map((key: string) => allMovies.find(m => m.key === key)?.title).filter(Boolean)
    };

    const prompt = `
      You are "Crate Intelligence", the recommendation engine for Crate TV, a premium indie film platform.
      
      User's Preferences:
      - Watchlist: ${userProfile.watchlist.join(', ') || 'None'}
      - Liked Movies: ${userProfile.likedMovies.join(', ') || 'None'}
      
      Available Movie Catalog:
      ${JSON.stringify(movieCatalog)}
      
      Based on the user's preferences, recommend 3 movies from the catalog that they haven't seen or added to their watchlist yet.
      Provide a brief, punchy "Why you'll like this" reasoning for each recommendation.
      
      If the user has no preferences, recommend 3 diverse and high-quality movies from the catalog.
      
      Return the recommendations in JSON format.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  movieKey: { type: Type.STRING },
                  reasoning: { type: Type.STRING }
                },
                required: ["movieKey", "reasoning"]
              }
            }
          },
          required: ["recommendations"]
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    const result = JSON.parse(text);
    return result.recommendations || [];

  } catch (error: any) {
    console.error("AI Recommendation Error:", error);
    return [];
  }
}
