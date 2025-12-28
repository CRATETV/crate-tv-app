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
      
      // Check for 429 Resource Exhausted, 8 RESOURCE_EXHAUSTED, or 503 Service Unavailable
      const isQuotaError = errorMessage.includes("429") || 
                           errorMessage.includes("limit") ||
                           errorMessage.includes("Quota exceeded") ||
                           errorMessage.includes("RESOURCE_EXHAUSTED") ||
                           errorMessage.includes("Resource exhausted");

      if (isQuotaError) {
          // If we've hit the limit, provide an actionable message
          const enhancedError = new Error(
              `AI Quota Exceeded (8 RESOURCE_EXHAUSTED). To fix this, enable billing in your Google AI Studio project (aistudio.google.com) or wait 24 hours. Costs are fractions of a penny: ai.google.dev/gemini-api/docs/billing`
          );
          (enhancedError as any).isQuotaError = true;
          
          if (attempt < maxRetries) {
              const delay = Math.pow(2, attempt + 1) * 1000;
              console.warn(`Gemini limit hit. Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
          }
          throw enhancedError;
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