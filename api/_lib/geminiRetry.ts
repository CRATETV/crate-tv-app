import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from '@google/genai';

/**
 * Executes a Gemini API call with exponential backoff retry logic.
 * Specifically targets 429 (Resource Exhausted) and code 8 errors.
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
      
      // Catch specific quota/exhausted strings and the code 8 (gRPC RESOURCE_EXHAUSTED)
      const isQuotaError = errorMessage.includes("429") || 
                           errorMessage.includes("limit") ||
                           errorMessage.includes("Quota exceeded") ||
                           errorMessage.includes("RESOURCE_EXHAUSTED") ||
                           errorMessage.includes("8") ||
                           errorMessage.includes("Resource exhausted");

      if (isQuotaError) {
          if (attempt < maxRetries) {
              const delay = Math.pow(2, attempt + 1) * 1000;
              console.warn(`Gemini quota limit hit. Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
          }
          // Flag this as a passive quota error for the UI
          const passiveError = new Error("The AI service has reached its temporary limit.");
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