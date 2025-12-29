import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from '@google/genai';

/**
 * Executes a Gemini API call with exponential backoff retry logic.
 * Specifically targets 429 (Resource Exhausted) errors and 503 errors.
 */
export async function generateContentWithRetry(
  params: GenerateContentParameters,
  maxRetries: number = 3
): Promise<GenerateContentResponse> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent(params);
      return response;
    } catch (error: any) {
      lastError = error;
      const errorMessage = error.message || "";
      
      const isQuotaError = errorMessage.includes("429") || 
                           errorMessage.includes("limit") ||
                           errorMessage.includes("Quota exceeded") ||
                           errorMessage.includes("RESOURCE_EXHAUSTED") ||
                           errorMessage.includes("Resource exhausted");

      if (isQuotaError) {
          if (attempt < maxRetries) {
              const delay = Math.pow(2, attempt + 1) * 1000;
              console.warn(`Gemini limit hit. Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
          }
          // Wrap as a passive error that won't crash callers that don't expect it
          const passiveError = new Error("AI Service temporarily reached its limit.");
          (passiveError as any).isQuotaError = true;
          throw passiveError;
      }

      if (errorMessage.includes("503") && attempt < maxRetries) {
        const delay = Math.pow(2, attempt + 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }

  throw lastError;
}